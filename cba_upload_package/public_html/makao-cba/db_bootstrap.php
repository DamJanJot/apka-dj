<?php

function makao_parse_env_file(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $out = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return [];
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));

        if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }

        $out[$key] = $value;
    }

    return $out;
}

function makao_env_value(string $key, array $fallback = [], ?string $default = null): ?string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === '') {
        $value = $fallback[$key] ?? null;
    }

    if ($value === null || $value === '') {
        return $default;
    }

    return (string)$value;
}

function makao_connect(array $cfg): PDO
{
    $charset = $cfg['db_charset'] ?? 'utf8mb4';
    $dsn = 'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=' . $charset;

    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec('SET NAMES ' . $charset . ' COLLATE utf8mb4_polish_ci');
    return $pdo;
}

function makao_get_pdo(): array
{
    $errors = [];

    $localConfigPath = __DIR__ . '/config.php';
    if (is_file($localConfigPath)) {
        try {
            $cfg = require $localConfigPath;
            if (is_array($cfg) && !empty($cfg['db_host']) && !empty($cfg['db_name']) && !empty($cfg['db_user'])) {
                return ['pdo' => makao_connect($cfg), 'source' => 'makao-cba/config.php', 'error' => null];
            }
            $errors[] = 'Niepelna konfiguracja w makao-cba/config.php';
        } catch (Throwable $e) {
            $errors[] = 'Bledny makao-cba/config.php';
        }
    }

    $envFromFile = makao_parse_env_file(dirname(__DIR__) . '/.env');

    $host = makao_env_value('DB_HOST', $envFromFile);
    $name = makao_env_value('DB_NAME', $envFromFile);
    $user = makao_env_value('DB_USER', $envFromFile);
    $pass = makao_env_value('DB_PASS', $envFromFile, '');

    if ($host && $name && $user) {
        try {
            return [
                'pdo' => makao_connect([
                    'db_host' => $host,
                    'db_name' => $name,
                    'db_user' => $user,
                    'db_pass' => $pass,
                    'db_charset' => 'utf8mb4',
                ]),
                'source' => '../.env or runtime env (DB_*)',
                'error' => null,
            ];
        } catch (Throwable $e) {
            $errors[] = 'Nie udalo sie polaczyc przez DB_*';
        }
    } else {
        $errors[] = 'Brakuje DB_HOST/DB_NAME/DB_USER';
    }

    return ['pdo' => null, 'source' => null, 'error' => implode('; ', $errors)];
}
