<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use App\Models\LegacyUser;
use App\Models\News;
use App\Models\Rate;
use App\Models\Crypto;
use App\Models\GoldPrice;

// ---------- AUTH (SPA cookie) ----------

Route::post('/login', function (Request $request) {
    $data = $request->validate([
        'email' => ['required','email'],
        'password' => ['required','string'],
    ]);

    // 1) standard (bcrypt) – działa dzięki getAuthPassword() w LegacyUser
    if (Auth::attempt(['email' => $data['email'], 'password' => $data['password']])) {
        $request->session()->regenerate();
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
            return response()->json(['ok' => true, 'upgraded' => true]);
        }
    }

    return response()->json(['message' => 'Nieprawidłowe dane logowania'], 422);
});

Route::post('/logout', function (Request $request) {
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

// ---------- FEEDY ----------
Route::get('/news', fn() => News::orderByDesc('id')->limit(30)->get());
Route::get('/rates', fn() => Rate::orderBy('id')->get());
Route::get('/crypto', fn() => Crypto::orderBy('id')->get());
Route::get('/gold', fn() => GoldPrice::orderBy('id')->get());
