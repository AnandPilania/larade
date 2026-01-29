<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use Illuminate\Support\Str;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [UserController::class, 'dashboard']);
    Route::get('/profile', [UserController::class, 'profile']);
});

Route::get('/test-string', function () {
    $text = 'Hello World';

    if (Str::contains($text, 'Hello')) {
        return 'Contains Hello';
    }

    if (Str::startsWith($text, 'Hello')) {
        return 'Starts with Hello';
    }

    return 'No match';
});
