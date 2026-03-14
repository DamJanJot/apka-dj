<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('optivio_projects', function (Blueprint $table) {
            $table->unsignedBigInteger('taskora_project_id')->nullable()->after('due_date');
            $table->index(['user_id', 'taskora_project_id'], 'optivio_projects_user_taskora_project_idx');
        });
    }

    public function down(): void
    {
        Schema::table('optivio_projects', function (Blueprint $table) {
            $table->dropIndex('optivio_projects_user_taskora_project_idx');
            $table->dropColumn('taskora_project_id');
        });
    }
};
