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
        'image_path',
        'is_mention',
        'read_at',
    ];

    protected $casts = [
        'is_mention' => 'boolean',
        'read_at' => 'datetime',
    ];
}
