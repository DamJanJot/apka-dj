<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\LoginController;

Route::get('/sanctum/csrf-cookie', [LoginController::class, 'csrf']);
Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->middleware('auth');


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\LegacyUser;

Route::post('/api/login', function (Request $request) {
    $data = $request->validate(['email'=>'required|email','password'=>'required|string']);

    if (Auth::attempt(['email' => $data['email'], 'password' => $data['password']])) {
        $request->session()->regenerate();
        return response()->json(['ok'=>true]);
    }

    // fallback md5 -> bcrypt (jeśli masz stare hasła)
    $u = LegacyUser::where('email',$data['email'])->first();
    if ($u && !str_starts_with((string)$u->haslo, '$2y$') && md5($data['password']) === $u->haslo) {
        $u->haslo = Hash::make($data['password']);
        $u->save();
        Auth::login($u);
        $request->session()->regenerate();
        return response()->json(['ok'=>true,'upgraded'=>true]);
    }

    return response()->json(['message'=>'Nieprawidłowe dane logowania'], 422);
});

Route::post('/api/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['ok'=>true]);
});




Route::get('/', function () {
    return view('welcome');
});
