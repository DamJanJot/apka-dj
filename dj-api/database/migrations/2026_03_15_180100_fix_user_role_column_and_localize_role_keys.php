<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('uzytkownicy')) {
            DB::statement("ALTER TABLE uzytkownicy MODIFY rola VARCHAR(64) NOT NULL DEFAULT 'user'");
        }

        $map = [
            'student' => 'uczen',
            'teacher' => 'nauczyciel',
            'employee' => 'pracownik',
        ];

        foreach ($map as $old => $new) {
            if (Schema::hasTable('uzytkownicy')) {
                DB::table('uzytkownicy')->where('rola', $old)->update(['rola' => $new]);
            }

            if (Schema::hasTable('neuronetix_role_app_assignments')) {
                DB::table('neuronetix_role_app_assignments')->where('role_key', $old)->update(['role_key' => $new]);
            }

            if (Schema::hasTable('neuronetix_role_panel_assignments')) {
                DB::table('neuronetix_role_panel_assignments')->where('role_key', $old)->update(['role_key' => $new]);
            }

            if (Schema::hasTable('neuronetix_role_change_logs')) {
                DB::table('neuronetix_role_change_logs')->where('old_role', $old)->update(['old_role' => $new]);
                DB::table('neuronetix_role_change_logs')->where('new_role', $old)->update(['new_role' => $new]);
            }

            if (Schema::hasTable('neuronetix_roles')) {
                $oldExists = DB::table('neuronetix_roles')->where('key', $old)->exists();
                if ($oldExists) {
                    $newExists = DB::table('neuronetix_roles')->where('key', $new)->exists();
                    if ($newExists) {
                        DB::table('neuronetix_roles')->where('key', $old)->delete();
                    } else {
                        DB::table('neuronetix_roles')->where('key', $old)->update(['key' => $new]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // Intentionally left empty - this migration performs data normalization and schema widening.
    }
};
