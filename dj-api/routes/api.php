<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use App\Http\Controllers\OrbitumChatController;
use App\Http\Controllers\OrbitumFriendsController;
use App\Http\Controllers\OrbitumMakaoOnlineController;
use App\Http\Controllers\OrbitumPostsController;
use App\Http\Controllers\OptivioController;
use App\Http\Controllers\TaskoraBridgeController;
use App\Http\Controllers\TeacherPanelController;
use App\Http\Controllers\Admin\UserRoleController;
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

    $access = method_exists($u, 'resolveAccess') ? $u->resolveAccess() : [
        'apps' => ['orbitum'],
        'panels' => ['orbitum' => ['dashboard']],
    ];

    return response()->json([
        'id' => $u->id,
        'email' => $u->email,
        'name' => $u->name,
        'imie' => $u->imie,
        'nazwisko' => $u->nazwisko,
        'nick' => $u->nick,
        'rola' => $u->rola,
        'avatar' => $u->zdjecie_profilowe,
        'access' => $access,
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
    Route::get('/overview', [OrbitumFriendsController::class, 'overview']);
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

// ---------- MAKAO ONLINE ----------
Route::middleware('auth:sanctum')->prefix('makao-online')->group(function () {
    Route::get('/overview', [OrbitumMakaoOnlineController::class, 'overview']);
    Route::post('/invite', [OrbitumMakaoOnlineController::class, 'invite']);
    Route::post('/incoming/{id}/accept', [OrbitumMakaoOnlineController::class, 'acceptIncoming']);
    Route::post('/incoming/{id}/reject', [OrbitumMakaoOnlineController::class, 'rejectIncoming']);
    Route::post('/outgoing/{id}/cancel', [OrbitumMakaoOnlineController::class, 'cancelOutgoing']);

    Route::get('/room/{roomId}', [OrbitumMakaoOnlineController::class, 'room']);
    Route::post('/room/{roomId}/sync', [OrbitumMakaoOnlineController::class, 'syncRoomState']);
    Route::post('/room/{roomId}/leave', [OrbitumMakaoOnlineController::class, 'leaveRoom']);
});

// ---------- OPTIVIO ----------
Route::middleware(['auth:sanctum', 'role:user,manager,admin,owner,analyst,support', 'access:optivio'])->prefix('optivio')->group(function () {
    Route::get('/projects', [OptivioController::class, 'projects']);
    Route::post('/projects', [OptivioController::class, 'createProject'])->middleware('role:manager,admin,owner');
    Route::patch('/projects/{projectId}/taskora-link', [OptivioController::class, 'linkTaskoraProject'])->middleware('role:manager,admin,owner');
    Route::post('/projects/{projectId}/tasks', [OptivioController::class, 'createTask'])->middleware('role:manager,admin,owner');
    Route::patch('/projects/{projectId}/tasks/{taskId}/status', [OptivioController::class, 'updateTaskStatus'])->middleware('role:manager,admin,owner,support');
    Route::patch('/projects/{projectId}/tasks/{taskId}/taskora-sync', [OptivioController::class, 'updateTaskoraSync'])->middleware('role:manager,admin,owner');
    Route::get('/overview', [OptivioController::class, 'overview']);
});

// ---------- TASKORA BRIDGE ----------
Route::middleware(['auth:sanctum', 'role:manager,admin,owner', 'access:taskora'])->prefix('taskora-bridge')->group(function () {
    Route::get('/projects', [TaskoraBridgeController::class, 'projects']);
    Route::post('/projects', [TaskoraBridgeController::class, 'createProject']);
    Route::get('/projects/{projectId}/tasks', [TaskoraBridgeController::class, 'tasks']);
    Route::post('/projects/{projectId}/tasks', [TaskoraBridgeController::class, 'createTask']);
});

// ---------- TEACHER PANEL ----------
Route::middleware(['auth:sanctum', 'access:neuronetix'])->prefix('teacher')->group(function () {
    Route::get('/overview', [TeacherPanelController::class, 'overview'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);

    Route::get('/tasks', [TeacherPanelController::class, 'tasks'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::post('/tasks', [TeacherPanelController::class, 'createTask'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);
    Route::patch('/tasks/{taskId}', [TeacherPanelController::class, 'updateTask'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);
    Route::delete('/tasks/{taskId}', [TeacherPanelController::class, 'deleteTask'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);
    Route::patch('/tasks/{taskId}/status', [TeacherPanelController::class, 'updateTaskStatus'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');

    Route::get('/quizzes', [TeacherPanelController::class, 'quizzes'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::post('/quizzes', [TeacherPanelController::class, 'createQuiz'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);
    Route::get('/quizzes/{quizId}', [TeacherPanelController::class, 'quizDetail'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::delete('/quizzes/{quizId}', [TeacherPanelController::class, 'deleteQuiz'])
        ->middleware(['role:nauczyciel,teacher,admin,owner', 'access:neuronetix,teacher']);
    Route::post('/quizzes/{quizId}/submit', [TeacherPanelController::class, 'submitQuiz'])
        ->middleware('role:uczen,student');

    Route::get('/notifications', [TeacherPanelController::class, 'notifications'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::post('/notifications/read-all', [TeacherPanelController::class, 'markNotificationsReadAll'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::post('/notifications/{notificationId}/read', [TeacherPanelController::class, 'markNotificationRead'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');

    Route::get('/quizzes/{quizId}/whiteboard-notes', [TeacherPanelController::class, 'quizWhiteboardNotes'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::post('/quizzes/{quizId}/whiteboard-notes', [TeacherPanelController::class, 'saveQuizWhiteboardNote'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
    Route::delete('/quizzes/{quizId}/whiteboard-notes/{noteId}', [TeacherPanelController::class, 'deleteQuizWhiteboardNote'])
        ->middleware('role:nauczyciel,teacher,admin,owner,uczen,student');
});

// ---------- ADMIN ----------
Route::middleware(['auth:sanctum', 'role:admin,owner'])->prefix('admin')->group(function () {
    Route::post('/users', [UserRoleController::class, 'createUser'])->middleware('access:admin,users');
    Route::get('/users', [UserRoleController::class, 'users'])->middleware('access:admin,users');
    Route::get('/relations', [UserRoleController::class, 'relations'])->middleware('access:admin,relations');
    Route::post('/relations', [UserRoleController::class, 'createRelation'])->middleware('access:admin,relations');
    Route::delete('/relations/{relationId}', [UserRoleController::class, 'deleteRelation'])->middleware('access:admin,relations');
    Route::post('/roles', [UserRoleController::class, 'createRole'])->middleware('access:admin,roles');
    Route::get('/roles', [UserRoleController::class, 'roles'])->middleware('access:admin,roles');
    Route::patch('/roles/{key}', [UserRoleController::class, 'updateRole'])->middleware('access:admin,roles');
    Route::delete('/roles/{key}', [UserRoleController::class, 'deleteRole'])->middleware('access:admin,roles');
    Route::get('/assignments', [UserRoleController::class, 'assignments'])->middleware('access:admin,assignments');
    Route::patch('/roles/{key}/app-assignments', [UserRoleController::class, 'syncRoleApps'])->middleware('access:admin,assignments');
    Route::patch('/roles/{key}/panel-assignments', [UserRoleController::class, 'syncRolePanels'])->middleware('access:admin,assignments');
    Route::get('/role-change-logs', [UserRoleController::class, 'history'])->middleware('access:admin,users');
    Route::get('/users/{userId}/role-history', [UserRoleController::class, 'userHistory'])->middleware('access:admin,users');
    Route::patch('/users/{userId}/role', [UserRoleController::class, 'update'])->middleware('access:admin,users');
});
