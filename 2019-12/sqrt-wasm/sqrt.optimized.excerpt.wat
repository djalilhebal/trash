 (func $assembly/index/guessNewX (; 26 ;) (type $FUNCSIG$dddd) (param $0 f64) (param $1 f64) (param $2 f64) (result f64)
  local.get $0
  local.get $2
  f64.sub
  local.get $0
  local.get $2
  f64.add
  local.get $0
  local.get $0
  f64.mul
  local.get $1
  f64.gt
  select
 )
 
 (func $assembly/index/sqrt (; 27 ;) (type $FUNCSIG$dd) (param $0 f64) (result f64)
  (local $1 f64)
  (local $2 f64)
  local.get $0
  f64.const 0
  f64.lt
  if
   f64.const -1
   return
  end
  f64.const 0.1
  f64.const 10
  local.get $0
  f64.const 1
  f64.lt
  select
  local.set $2
  loop $continue|0
   local.get $2
   f64.const 1e-08
   f64.gt
   i32.const 0
   local.get $1
   local.get $1
   f64.mul
   local.get $0
   f64.ne
   select
   if
    local.get $1
    local.get $0
    local.get $1
    local.get $0
    local.get $2
    call $assembly/index/guessNewX
    local.get $0
    local.get $2
    call $assembly/index/guessNewX
    local.get $1
    f64.eq
    if
     local.get $2
     f64.const 10
     f64.div
     local.set $2
    end
    local.get $2
    call $assembly/index/guessNewX
    local.set $1
    br $continue|0
   end
  end
  local.get $1
 )
