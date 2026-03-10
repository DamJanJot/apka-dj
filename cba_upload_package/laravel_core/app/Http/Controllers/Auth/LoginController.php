<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function csrf(Request $r)
    {
        return response()->json(['ok' => true]);
    }

    public function login(Request $r)
    {
        $data = $r->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (Auth::attempt($data, true)) {
            $r->session()->regenerate();
            return response()->json(['ok' => true]);
        }
        return response()->json(['ok' => false, 'message' => 'Błędne dane logowania'], 422);
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        return response()->json(['ok' => true]);
    }
}
