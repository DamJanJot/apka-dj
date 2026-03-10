<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $table = 'tasks';
    public $timestamps = false;
    protected $casts = ['completed' => 'bool', 'remind_date' => 'datetime'];
    protected $fillable = ['list_id','user_id','name','completed','remind_date','ordering'];

    public function list()
    {
        return $this->belongsTo(TodoList::class, 'list_id');
    }
}
