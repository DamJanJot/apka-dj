<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neuronetix_role_app_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('role_key', 64);
            $table->string('app_key', 64);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['role_key', 'app_key']);
            $table->index(['app_key', 'role_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neuronetix_role_app_assignments');
    }
};