<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrbitumChatMessage extends Model
{
    protected $table = 'orbitum_chat_messages';

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'body',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
