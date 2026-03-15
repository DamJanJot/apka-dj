<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('neuronetix_teacher_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('neuronetix_teacher_tasks', 'has_whiteboard')) {
                $table->boolean('has_whiteboard')->default(false)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('neuronetix_teacher_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('neuronetix_teacher_tasks', 'has_whiteboard')) {
                $table->dropColumn('has_whiteboard');
            }
        });
    }
};
