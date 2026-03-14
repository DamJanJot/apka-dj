<?php

$frontendOrigins = collect(explode(',', (string) env('FRONTEND_ORIGINS', '')))
    ->map(fn($origin) => trim($origin))
    ->filter()
    ->values()
    ->all();

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // DOKŁADNE originy – dopisz swoje domeny, jeśli masz inne prewiewy
    'allowed_origins' => array_values(array_unique(array_merge([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ], $frontendOrigins))),

    // wzorce dla Vercel (dowolny *.vercel.app)
    'allowed_origins_patterns' => [
        '#^https://.*\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // MUSI być true dla cookies (Sanctum SPA)
    'supports_credentials' => true,
];
