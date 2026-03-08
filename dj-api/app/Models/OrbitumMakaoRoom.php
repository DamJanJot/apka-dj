<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumMakaoRoom extends Model
{
    protected $table = 'orbitum_makao_rooms';

    protected $fillable = [
        'player_one_id',
        'player_two_id',
        'status',
        'turn_user_id',
        'last_action_by_user_id',
        'state_json',
        'action_version',
    ];

    protected $casts = [
        'state_json' => 'array',
    ];
}
