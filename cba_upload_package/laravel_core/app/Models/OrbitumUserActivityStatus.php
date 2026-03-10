<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumUserActivityStatus extends Model
{
    protected $table = 'orbitum_user_activity_statuses';

    protected $fillable = [
        'user_id',
        'is_online',
        'last_seen_at',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'last_seen_at' => 'datetime',
    ];
}
