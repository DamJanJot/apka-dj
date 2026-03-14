<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OptivioTask extends Model
{
    protected $table = 'optivio_tasks';

    protected $fillable = [
        'project_id',
        'user_id',
        'title',
        'description',
        'due_date',
        'status',
        'taskora_synced',
        'taskora_task_id',
        'taskora_last_attempt_at',
        'taskora_error',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'taskora_synced' => 'boolean',
        'taskora_last_attempt_at' => 'datetime',
    ];
}
