<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LegacyUser extends Authenticatable
{
    use Notifiable;

    private const AVAILABLE_APP_KEYS = ['orbitum', 'neuronetix', 'taskora', 'optivio', 'chic', 'admin'];

    private const AVAILABLE_PANELS = [
        'orbitum' => ['dashboard', 'calendar', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
        'neuronetix' => ['dashboard', 'messages', 'friends', 'teacher', 'student', 'student_tasks', 'student_quizzes', 'student_tests', 'docs'],
        'taskora' => ['dashboard', 'projects', 'messages', 'friends', 'docs'],
        'optivio' => ['dashboard', 'projects', 'messages', 'friends', 'docs'],
        'chic' => ['dashboard', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
        'admin' => ['dashboard', 'users', 'roles', 'assignments', 'relations', 'docs', 'sidebar_settings'],
    ];

    protected $table = 'uzytkownicy';
    protected $primaryKey = 'id';
    public $timestamps = false;

    // pilnuj, żeby hasła nie wychodziły w JSON
    protected $hidden = ['haslo'];

    // pozwól na masowe wypełnianie (albo ustaw $guarded = [])
    protected $fillable = [
        'email', 'imie', 'nazwisko', 'nick', 'rola', 'zdjecie_profilowe', 'haslo',
    ];

    /**
     * Laravel przy logowaniu odpytuje getAuthPassword().
     * Zwracamy kolumnę "haslo", a nie "password".
     */
    public function getAuthPassword()
    {
        return $this->haslo;
    }

    /**
     * Opcjonalnie: jeśli gdzieś w kodzie ktoś ustawi $user->password,
     * to przemapuj to na kolumnę "haslo".
     */
    public function setPasswordAttribute($value)
    {
        $this->attributes['haslo'] = $value;
    }

    public function getPasswordAttribute()
    {
        return $this->attributes['haslo'] ?? null;
    }

    public function hasRole(string $role): bool
    {
        $current = $this->normalizedRole();
        return $current !== '' && $current === strtolower(trim($role));
    }

    public function hasAnyRole(array $roles): bool
    {
        $current = $this->normalizedRole();
        if ($current === '') {
            return false;
        }

        foreach ($roles as $role) {
            if ($current === strtolower(trim((string) $role))) {
                return true;
            }
        }

        return false;
    }

    public function normalizedRole(): string
    {
        return strtolower(trim((string) ($this->rola ?? '')));
    }

    public function resolveAccess(): array
    {
        $role = $this->normalizedRole();
        $defaultApps = self::defaultAppAssignments()[$role] ?? ['orbitum'];
        $defaultPanels = self::defaultPanelAssignmentsForRole($role, $defaultApps);

        $apps = $defaultApps;
        if (Schema::hasTable('neuronetix_role_app_assignments')) {
            $assignedApps = DB::table('neuronetix_role_app_assignments')
                ->where('role_key', $role)
                ->pluck('app_key')
                ->map(static fn (string $app): string => strtolower(trim($app)))
                ->filter(static fn (string $app): bool => in_array($app, self::AVAILABLE_APP_KEYS, true))
                ->values()
                ->all();

            if (!empty($assignedApps)) {
                $apps = $assignedApps;
            }
        }

        $panels = $defaultPanels;
        if (Schema::hasTable('neuronetix_role_panel_assignments')) {
            $rows = DB::table('neuronetix_role_panel_assignments')
                ->where('role_key', $role)
                ->get(['app_key', 'panel_key']);

            if ($rows->isNotEmpty()) {
                $panels = [];
                foreach ($rows as $row) {
                    $appKey = strtolower(trim((string) $row->app_key));
                    $panelKey = strtolower(trim((string) $row->panel_key));

                    if (!in_array($appKey, $apps, true)) {
                        continue;
                    }

                    if (!isset(self::AVAILABLE_PANELS[$appKey]) || !in_array($panelKey, self::AVAILABLE_PANELS[$appKey], true)) {
                        continue;
                    }

                    $panels[$appKey] ??= [];
                    if (!in_array($panelKey, $panels[$appKey], true)) {
                        $panels[$appKey][] = $panelKey;
                    }
                }
            }
        }

        foreach ($apps as $appKey) {
            $panels[$appKey] ??= [];
        }

        return [
            'apps' => array_values($apps),
            'panels' => $panels,
        ];
    }

    public static function availableApps(): array
    {
        return self::AVAILABLE_APP_KEYS;
    }

    public static function availablePanels(): array
    {
        return self::AVAILABLE_PANELS;
    }

    public static function defaultAppAssignments(): array
    {
        return [
            'owner' => self::AVAILABLE_APP_KEYS,
            'admin' => self::AVAILABLE_APP_KEYS,
            'manager' => ['neuronetix', 'taskora', 'optivio'],
            'pracownik' => ['neuronetix', 'taskora', 'optivio'],
            'nauczyciel' => ['neuronetix', 'taskora'],
            'uczen' => ['neuronetix'],
            'analyst' => ['neuronetix', 'optivio'],
            'support' => ['neuronetix', 'optivio'],
            'moderator' => ['orbitum', 'neuronetix'],
            'user' => ['orbitum', 'neuronetix'],
            'guest' => ['orbitum'],
            // Backward compatibility for any old keys that still exist in DB.
            'employee' => ['neuronetix', 'taskora', 'optivio'],
            'teacher' => ['neuronetix', 'taskora'],
            'student' => ['neuronetix'],
        ];
    }

    private static function defaultPanelAssignmentsForRole(string $role, array $apps): array
    {
        $panels = [];
        foreach ($apps as $appKey) {
            if (!isset(self::AVAILABLE_PANELS[$appKey])) {
                continue;
            }

            if ($appKey === 'admin' && !in_array($role, ['owner', 'admin'], true)) {
                $panels[$appKey] = [];
                continue;
            }

            $panelList = self::AVAILABLE_PANELS[$appKey];
            if ($appKey === 'neuronetix' && !in_array($role, ['nauczyciel', 'teacher', 'admin', 'owner'], true)) {
                $panelList = array_values(array_filter($panelList, static fn (string $panel): bool => $panel !== 'teacher'));
            }

            if ($appKey === 'neuronetix' && !in_array($role, ['uczen', 'student', 'admin', 'owner'], true)) {
                $panelList = array_values(array_filter(
                    $panelList,
                    static fn (string $panel): bool => !in_array($panel, ['student', 'student_tasks', 'student_quizzes', 'student_tests'], true)
                ));
            }

            $panels[$appKey] = $panelList;
        }

        return $panels;
    }
}
