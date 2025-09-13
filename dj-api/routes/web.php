<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\LoginController;

Route::get('/sanctum/csrf-cookie', [LoginController::class, 'csrf']);
Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->middleware('auth');



Route::get('/', function () {
    return view('welcome');
});
