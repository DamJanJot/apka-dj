<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumFriendRequest extends Model
{
    protected $table = 'orbitum_friend_requests';

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'status',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];
}
