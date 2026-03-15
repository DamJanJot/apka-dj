<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NeuroNetixRoleSeeder extends Seeder
{
    public function run(): void
    {
        $defaultRoles = [
            [
                'key' => 'owner',
                'name' => 'Owner',
                'description' => 'Pelny dostep do aplikacji i ustawien.',
                'is_system' => true,
            ],
            [
                'key' => 'admin',
                'name' => 'Admin',
                'description' => 'Zarzadzanie uzytkownikami i konfiguracja systemu.',
                'is_system' => true,
            ],
            [
                'key' => 'moderator',
                'name' => 'Moderator',
                'description' => 'Moderacja tresci i obsluga zgloszen.',
                'is_system' => true,
            ],
            [
                'key' => 'manager',
                'name' => 'Manager',
                'description' => 'Zarzadzanie zespolami i procesami operacyjnymi.',
                'is_system' => true,
            ],
            [
                'key' => 'pracownik',
                'name' => 'Pracownik',
                'description' => 'Realizacja przypisanych czynnosci operacyjnych.',
                'is_system' => true,
            ],
            [
                'key' => 'nauczyciel',
                'name' => 'Nauczyciel',
                'description' => 'Prowadzenie uczniow i nadzor aktywnosci edukacyjnych.',
                'is_system' => true,
            ],
            [
                'key' => 'uczen',
                'name' => 'Uczen',
                'description' => 'Rola podrzedna w relacji nauczyciel-uczen.',
                'is_system' => true,
            ],
            [
                'key' => 'analyst',
                'name' => 'Analyst',
                'description' => 'Dostep do raportow i analityki.',
                'is_system' => true,
            ],
            [
                'key' => 'support',
                'name' => 'Support',
                'description' => 'Wsparcie klienta i obsluga ticketow.',
                'is_system' => true,
            ],
            [
                'key' => 'user',
                'name' => 'User',
                'description' => 'Podstawowa rola aplikacyjna.',
                'is_system' => true,
            ],
            [
                'key' => 'guest',
                'name' => 'Guest',
                'description' => 'Ograniczony dostep tylko do wybranych funkcji.',
                'is_system' => true,
            ],
        ];

        $rolesByKey = [];
        foreach ($defaultRoles as $role) {
            $rolesByKey[$role['key']] = $role;
        }

        if (Schema::hasTable('uzytkownicy') && Schema::hasColumn('uzytkownicy', 'rola')) {
            $existingRoles = DB::table('uzytkownicy')
                ->whereNotNull('rola')
                ->where('rola', '<>', '')
                ->distinct()
                ->pluck('rola');

            foreach ($existingRoles as $existingRole) {
                $key = strtolower(trim((string) $existingRole));
                if ($key === '') {
                    continue;
                }

                if (!isset($rolesByKey[$key])) {
                    $rolesByKey[$key] = [
                        'key' => $key,
                        'name' => ucfirst($key),
                        'description' => 'Rola zaimportowana z aktualnej tabeli uzytkownikow.',
                        'is_system' => false,
                    ];
                }
            }
        }

        $now = now();

        foreach ($rolesByKey as $role) {
            $exists = DB::table('neuronetix_roles')->where('key', $role['key'])->exists();

            if ($exists) {
                DB::table('neuronetix_roles')
                    ->where('key', $role['key'])
                    ->update([
                        'name' => $role['name'],
                        'description' => $role['description'],
                        'is_system' => $role['is_system'],
                        'updated_at' => $now,
                    ]);
                continue;
            }

            DB::table('neuronetix_roles')->insert([
                'key' => $role['key'],
                'name' => $role['name'],
                'description' => $role['description'],
                'is_system' => $role['is_system'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
