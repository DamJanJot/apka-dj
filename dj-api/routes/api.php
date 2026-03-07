<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use App\Http\Controllers\OrbitumChatController;
use App\Http\Controllers\OrbitumFriendsController;
use App\Http\Controllers\OrbitumPostsController;
use App\Models\OrbitumFriendship;
use App\Models\LegacyUser;
use App\Models\News;
use App\Models\OrbitumUserActivityStatus;
use App\Models\Rate;
use App\Models\Crypto;
use App\Models\GoldPrice;




Route::middleware('auth:sanctum')->put('/profile/update', function (Request $request) {
    $user = $request->user();
    $user->update([
        'imie' => $request->imie,
        'email' => $request->email,
        'zdjecie_profilowe' => $request->zdjecie_profilowe,
    ]);
    return response()->json(['success' => true, 'user' => $user]);
});








// ---------- AUTH (SPA cookie) ----------

Route::post('/register', function (Request $request) {
    $data = $request->validate([
        'imie' => ['required', 'string', 'max:100'],
        'email' => ['required', 'email', 'max:255', 'unique:uzytkownicy,email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $user = LegacyUser::create([
        'imie' => $data['imie'],
        'email' => $data['email'],
        'nick' => Str::before($data['email'], '@'),
        'rola' => 'user',
        'haslo' => Hash::make($data['password']),
    ]);

    Auth::login($user);
    $request->session()->regenerate();

    OrbitumUserActivityStatus::query()->updateOrCreate(
        ['user_id' => (int) Auth::id()],
        ['is_online' => true, 'last_seen_at' => now()]
    );

    return response()->json(['ok' => true], 201);
});

Route::post('/login', function (Request $request) {
    $data = $request->validate([
        'email' => ['required','email'],
        'password' => ['required','string'],
    ]);

    // 1) standard (bcrypt) – działa dzięki getAuthPassword() w LegacyUser
    if (Auth::attempt(['email' => $data['email'], 'password' => $data['password']])) {
        $request->session()->regenerate();

        OrbitumUserActivityStatus::query()->updateOrCreate(
            ['user_id' => (int) Auth::id()],
            ['is_online' => true, 'last_seen_at' => now()]
        );

        return response()->json(['ok' => true]);
    }

    // 2) fallback md5 -> migracja do bcrypt
    $u = LegacyUser::where('email', $data['email'])->first();
    if ($u) {
        $raw = $data['password'];
        $db  = (string) $u->haslo;

        $looksBcrypt = str_starts_with($db, '$2y$');
        if (!$looksBcrypt && md5($raw) === $db) {
            // ZAPISUJEMY DO "haslo", nie "password"
            $u->forceFill(['haslo' => Hash::make($raw)])->save();

            Auth::login($u);
            $request->session()->regenerate();

            OrbitumUserActivityStatus::query()->updateOrCreate(
                ['user_id' => (int) Auth::id()],
                ['is_online' => true, 'last_seen_at' => now()]
            );

            return response()->json(['ok' => true, 'upgraded' => true]);
        }
    }

    return response()->json(['message' => 'Nieprawidłowe dane logowania'], 422);
});

Route::post('/logout', function (Request $request) {
    $id = (int) optional($request->user())->id;
    if ($id > 0) {
        OrbitumUserActivityStatus::query()->updateOrCreate(
            ['user_id' => $id],
            ['is_online' => false, 'last_seen_at' => now()]
        );
    }

    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['ok' => true]);
})->middleware('auth:sanctum');

Route::get('/me', function (Request $request) {
    $u = $request->user(); // LegacyUser
    if (!$u) return response()->json(null, 401);

    return response()->json([
        'id' => $u->id,
        'email' => $u->email,
        'name' => $u->name,
        'imie' => $u->imie,
        'nazwisko' => $u->nazwisko,
        'nick' => $u->nick,
        'rola' => $u->rola,
        'avatar' => $u->zdjecie_profilowe,
    ]);
})->middleware('auth:sanctum');

Route::get('/profile/{userId}', function (Request $request, int $userId) {
    $me = (int) $request->user()->id;

    if ($userId === $me) {
        $u = LegacyUser::query()->findOrFail($userId);
        return response()->json([
            'id' => $u->id,
            'imie' => $u->imie,
            'nazwisko' => $u->nazwisko,
            'email' => $u->email,
            'zdjecie_profilowe' => $u->zdjecie_profilowe,
            'is_self' => true,
            'is_friend' => true,
        ]);
    }

    [$one, $two] = $me < $userId ? [$me, $userId] : [$userId, $me];
    $isFriend = OrbitumFriendship::query()
        ->where('user_one_id', $one)
        ->where('user_two_id', $two)
        ->exists();

    if (!$isFriend) {
        return response()->json(['message' => 'Profil dostepny tylko dla znajomych.'], 403);
    }

    $u = LegacyUser::query()->findOrFail($userId);
    return response()->json([
        'id' => $u->id,
        'imie' => $u->imie,
        'nazwisko' => $u->nazwisko,
        'email' => $u->email,
        'zdjecie_profilowe' => $u->zdjecie_profilowe,
        'is_self' => false,
        'is_friend' => true,
    ]);
})->middleware('auth:sanctum');

// ---------- FEEDY ----------
Route::get('/news', fn() => News::orderByDesc('id')->limit(30)->get());
Route::get('/rates', fn() => Rate::orderBy('id')->get());
Route::get('/crypto', fn() => Crypto::orderBy('id')->get());
Route::get('/gold', fn() => GoldPrice::orderBy('id')->get());

// ---------- CZAT / POWIADOMIENIA / AKTYWNOSC ----------
Route::middleware('auth:sanctum')->prefix('chat')->group(function () {
    Route::get('/users', [OrbitumChatController::class, 'users']);
    Route::get('/thread/{userId}', [OrbitumChatController::class, 'thread']);
    Route::post('/send', [OrbitumChatController::class, 'send']);

    Route::get('/notifications', [OrbitumChatController::class, 'notifications']);
    Route::post('/notifications/{fromUserId}/read', [OrbitumChatController::class, 'markReadFromUser']);

    Route::post('/activity/ping', [OrbitumChatController::class, 'pingActivity']);
    Route::post('/activity/offline', [OrbitumChatController::class, 'setOffline']);
});

// ---------- ZNAJOMI ----------
Route::middleware('auth:sanctum')->prefix('friends')->group(function () {
    Route::get('/list', [OrbitumFriendsController::class, 'list']);
    Route::get('/incoming', [OrbitumFriendsController::class, 'incoming']);
    Route::get('/outgoing', [OrbitumFriendsController::class, 'outgoing']);
    Route::get('/search', [OrbitumFriendsController::class, 'search']);

    Route::post('/request', [OrbitumFriendsController::class, 'sendRequest']);
    Route::post('/incoming/{id}/accept', [OrbitumFriendsController::class, 'acceptIncoming']);
    Route::post('/incoming/{id}/reject', [OrbitumFriendsController::class, 'rejectIncoming']);
    Route::post('/outgoing/{id}/cancel', [OrbitumFriendsController::class, 'cancelOutgoing']);
});

// ---------- POSTY / TABLICA ----------
Route::middleware('auth:sanctum')->prefix('posts')->group(function () {
    Route::get('/feed', [OrbitumPostsController::class, 'feed']);
    Route::get('/audience/friends', [OrbitumPostsController::class, 'mySelectableFriends']);
    Route::post('/create', [OrbitumPostsController::class, 'create']);
    Route::patch('/{postId}', [OrbitumPostsController::class, 'updatePost']);
    Route::delete('/{postId}', [OrbitumPostsController::class, 'deletePost']);

    Route::get('/{postId}/comments', [OrbitumPostsController::class, 'comments']);
    Route::post('/{postId}/comments', [OrbitumPostsController::class, 'addComment']);
    Route::patch('/comments/{commentId}', [OrbitumPostsController::class, 'updateComment']);
    Route::delete('/comments/{commentId}', [OrbitumPostsController::class, 'deleteComment']);
    Route::post('/{postId}/reactions', [OrbitumPostsController::class, 'setReaction']);

    Route::get('/notifications/mentions', [OrbitumPostsController::class, 'mentionNotifications']);
    Route::post('/notifications/mentions/read-all', [OrbitumPostsController::class, 'markMentionsRead']);
});
