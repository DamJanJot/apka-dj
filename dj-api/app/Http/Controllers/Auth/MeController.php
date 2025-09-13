<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function __invoke(Request $r)
    {
        $u = $r->user();
        return [
            'id' => $u->id ?? null,
            'name' => $u->name ?? null,
            'email' => $u->email ?? null,
            'avatarUrl' => $u->avatar_url ?? null,
            'role' => $u->rola ?? null,
        ];
    }
}
