<?php

return [
'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => [env('FRONTEND_URL','http://localhost:5173')],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'supports_credentials' => true,

];
