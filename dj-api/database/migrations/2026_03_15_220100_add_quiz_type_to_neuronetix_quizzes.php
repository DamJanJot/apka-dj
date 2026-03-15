<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('neuronetix_quizzes', function (Blueprint $table) {
            if (!Schema::hasColumn('neuronetix_quizzes', 'quiz_type')) {
                $table->string('quiz_type', 24)->default('quiz')->after('description');
                $table->index(['quiz_type', 'is_active'], 'nq_type_active_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('neuronetix_quizzes', function (Blueprint $table) {
            if (Schema::hasColumn('neuronetix_quizzes', 'quiz_type')) {
                $table->dropIndex('nq_type_active_idx');
                $table->dropColumn('quiz_type');
            }
        });
    }
};
