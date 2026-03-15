<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireAssignedAccess
{
    public function handle(Request $request, Closure $next, string $appKey, string $panelKey = '')
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        if (!method_exists($user, 'resolveAccess')) {
            return $next($request);
        }

        $access = $user->resolveAccess();
        $apps = array_map(
            static fn ($item): string => strtolower(trim((string) $item)),
            (array) ($access['apps'] ?? [])
        );

        $normalizedApp = strtolower(trim($appKey));
        if ($normalizedApp === '' || !in_array($normalizedApp, $apps, true)) {
            return response()->json(['message' => 'Brak dostepu do tej aplikacji.'], 403);
        }

        $normalizedPanel = strtolower(trim($panelKey));
        if ($normalizedPanel !== '') {
            $rawPanels = (array) (($access['panels'] ?? [])[$normalizedApp] ?? []);
            $panels = array_map(
                static fn ($item): string => strtolower(trim((string) $item)),
                $rawPanels
            );

            if (!in_array($normalizedPanel, $panels, true)) {
                return response()->json(['message' => 'Brak dostepu do tego panelu.'], 403);
            }
        }

        return $next($request);
    }
}
