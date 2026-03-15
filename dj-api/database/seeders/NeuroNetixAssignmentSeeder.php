<?php

namespace Database\Seeders;

use App\Models\LegacyUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NeuroNetixAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('neuronetix_role_app_assignments') || !Schema::hasTable('neuronetix_role_panel_assignments')) {
            return;
        }

        $now = now();
        $defaultApps = LegacyUser::defaultAppAssignments();
        $availablePanels = LegacyUser::availablePanels();

        foreach ($defaultApps as $roleKey => $apps) {
            foreach ($apps as $appKey) {
                $exists = DB::table('neuronetix_role_app_assignments')
                    ->where('role_key', $roleKey)
                    ->where('app_key', $appKey)
                    ->exists();

                if (!$exists) {
                    DB::table('neuronetix_role_app_assignments')->insert([
                        'role_key' => $roleKey,
                        'app_key' => $appKey,
                        'created_at' => $now,
                    ]);
                }

                foreach (($availablePanels[$appKey] ?? []) as $panelKey) {
                    if ($appKey === 'admin' && !in_array($roleKey, ['owner', 'admin'], true)) {
                        continue;
                    }

                    if ($appKey === 'neuronetix' && $panelKey === 'teacher' && !in_array($roleKey, ['nauczyciel', 'teacher', 'owner', 'admin'], true)) {
                        continue;
                    }

                    if ($appKey === 'neuronetix' && $panelKey === 'student' && !in_array($roleKey, ['uczen', 'student', 'owner', 'admin'], true)) {
                        continue;
                    }

                    if ($appKey === 'neuronetix' && in_array($panelKey, ['student_tasks', 'student_quizzes', 'student_tests'], true) && !in_array($roleKey, ['uczen', 'student', 'owner', 'admin'], true)) {
                        continue;
                    }

                    $panelExists = DB::table('neuronetix_role_panel_assignments')
                        ->where('role_key', $roleKey)
                        ->where('app_key', $appKey)
                        ->where('panel_key', $panelKey)
                        ->exists();

                    if (!$panelExists) {
                        DB::table('neuronetix_role_panel_assignments')->insert([
                            'role_key' => $roleKey,
                            'app_key' => $appKey,
                            'panel_key' => $panelKey,
                            'created_at' => $now,
                        ]);
                    }
                }
            }
        }
    }
}