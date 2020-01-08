 (func $assembly/index/guessNewX (; 27 ;) (type $FUNCSIG$dddd) (param $0 f64) (param $1 f64) (param $2 f64) (result f64)
  local.get $0
  local.get $0
  f64.mul
  local.get $1
  f64.gt
  if
   local.get $0
   local.get $2
   f64.sub
   return
  else
   local.get $0
   local.get $2
   f64.add
   return
  end
  unreachable
 )
 
 (func $assembly/index/sqrt (; 28 ;) (type $FUNCSIG$dd) (param $0 f64) (result f64)
  (local $1 f64)
  (local $2 f64)
  local.get $0
  f64.const 0
  f64.lt
  if
   f64.const -1
   return
  end
  local.get $0
  f64.const 1
  f64.lt
  if (result f64)
   f64.const 0.1
  else
   f64.const 10
  end
  local.set $1
  f64.const 0
  local.set $2
  block $break|0
   loop $continue|0
    local.get $2
    local.get $2
    f64.mul
    local.get $0
    f64.ne
    if (result i32)
     local.get $1
     f64.const 1e-08
     f64.gt
    else
     i32.const 0
    end
    i32.eqz
    br_if $break|0
    local.get $2
    local.get $0
    local.get $1
    call $assembly/index/guessNewX
    local.get $0
    local.get $1
    call $assembly/index/guessNewX
    local.get $2
    f64.eq
    if
     local.get $1
     f64.const 10
     f64.div
     local.set $1
    end
    local.get $2
    local.get $0
    local.get $1
    call $assembly/index/guessNewX
    local.set $2
    br $continue|0
   end
   unreachable
  end
  local.get $2
 )
