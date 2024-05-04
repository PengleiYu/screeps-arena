// This stuff is arena-specific
import { getRange, getTicks } from "game/utils";
import { ArenaContext, ArenaContextImpl, RoleFactory } from "./roles";

// You can also import your files like this:
// import {roleAttacker} from './roles/attacker.mjs';

// We can define global objects that will be valid for the entire match.
// The game guarantees there will be no global reset during the match.
// Note that you cannot assign any game objects here, since they are populated on the first tick, not when the script is initialized.
let context: ArenaContext;
let factory: RoleFactory;
let maxCountOfEnemy: number;

// todo 敌人会等待在超时前进攻，这会导致反攻时超时
// 消极积极策略翻转已成功
function checkPositive(context: ArenaContext) {
  let myFlag = context.myFlag;
  let enemyCreeps = context.enemyCreeps;
  if (enemyCreeps.length > maxCountOfEnemy * 0.6) {
    console.log(`敌人最大数量=${maxCountOfEnemy},当前数量=${enemyCreeps.length}`);
    // 敌人存活数量不能超过一半
    return false;
  }
  let enemyNearMyFlag = enemyCreeps.filter(c => {
    let range = getRange({ x: myFlag.x, y: myFlag.y }, { x: c.x, y: c.y });
    return range < 10;
  });
  console.log(`我方旗子附近敌人数量=${enemyNearMyFlag.length}`);
  // 我方旗子附近没有敌人
  return enemyNearMyFlag.length == 0;
}

// This is the only exported function from the main module. It is called every tick.
export function loop(): void {
  // We assign global variables here. They will be accessible throughout the tick, and even on the following ticks too.
  // getObjectsByPrototype function is the alternative to Room.find from Screeps World.
  // There is no Game.creeps or Game.structures, you can manage game objects in your own way.
  if (!context) {
    context = new ArenaContextImpl();
  }
  if (!factory) {
    factory = new RoleFactory(context);
  }
  if (!maxCountOfEnemy) {
    maxCountOfEnemy = context.enemyCreeps.length;
  }

  // Notice how getTime is a global function, but not Game.time anymore
  if (getTicks() % 10 === 0) {
    console.log(`I have ${context.myCreeps.length} creeps`);
  }
  let positive = checkPositive(context);

  // Run all my creeps according to their bodies
  context.myCreeps
    .map(c => factory.createRole(c))
    .forEach(it => {
      it.positive = positive;
      it.play();
    });
}
