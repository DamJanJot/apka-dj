<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\RateController;
use App\Http\Controllers\Api\CryptoController;
use App\Http\Controllers\Api\GoldController;

Route::get('/news',  [NewsController::class, 'index']);
Route::get('/rates', [RateController::class, 'index']);
Route::get('/crypto', [CryptoController::class, 'index']);
Route::get('/gold',  [GoldController::class, 'index']);


use App\Http\Controllers\Auth\MeController;

Route::middleware('auth:sanctum')->get('/me', MeController::class);



Route::middleware('auth:sanctum')->group(function () {
    Route::get('/tasks', [\App\Http\Controllers\TaskController::class, 'index']);
    Route::post('/tasks', [\App\Http\Controllers\TaskController::class, 'store']);
    Route::patch('/tasks/{task}/toggle', [\App\Http\Controllers\TaskController::class, 'toggle']);
    Route::delete('/tasks/{task}', [\App\Http\Controllers\TaskController::class, 'destroy']);
});





Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notes', [\App\Http\Controllers\NoteController::class, 'index']);
    Route::post('/notes', [\App\Http\Controllers\NoteController::class, 'store']);
    Route::patch('/notes/{note}', [\App\Http\Controllers\NoteController::class, 'update']);
    Route::delete('/notes/{note}', [\App\Http\Controllers\NoteController::class, 'destroy']);
});


Route::middleware('auth:sanctum')->group(function () {
    Route::get('/chat/{userId}', [\App\Http\Controllers\MessageController::class, 'thread']);
    Route::post('/chat/send', [\App\Http\Controllers\MessageController::class, 'send']);
});
    Route::post('/chat/mark-read/{messageId}', [\App\Http\Controllers\MessageController::class, 'markRead']);
    Route::delete('/chat/{messageId}', [\App\Http\Controllers\MessageController::class, 'destroy']);



Route::post('/login', [\App\Http\Controllers\Auth\LoginController::class, 'login'])->name('login');
Route::post('/logout', [\App\Http\Controllers\Auth\LoginController::class, 'logout'])->middleware('auth');
Route::get('/me', function() {
    return auth()->user();
})->middleware('auth');