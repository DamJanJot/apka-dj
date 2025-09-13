<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TodoList extends Model
{
    protected $table = 'lists';
    public $timestamps = false;
    protected $fillable = ['user_id','name','color','shared_with'];

    public function tasks()
    {
        return $this->hasMany(Task::class, 'list_id');
    }
}
