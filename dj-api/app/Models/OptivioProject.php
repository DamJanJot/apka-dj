<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OptivioProject extends Model
{
    protected $table = 'optivio_projects';

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'due_date',
        'taskora_project_id',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'taskora_project_id' => 'integer',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(OptivioTask::class, 'project_id', 'id');
    }
}
