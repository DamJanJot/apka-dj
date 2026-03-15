<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        if (empty($roles)) {
            return $next($request);
        }

        $normalizedRoles = array_map(
            static fn (string $role): string => strtolower(trim($role)),
            $roles
        );

        $userRole = strtolower(trim((string) ($user->rola ?? '')));
        if ($userRole === '' || !in_array($userRole, $normalizedRoles, true)) {
            return response()->json(['message' => 'Brak uprawnien do wykonania tej operacji.'], 403);
        }

        return $next($request);
    }
}
