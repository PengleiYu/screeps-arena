// This stuff is arena-specific
import { getTicks } from "game/utils";
import { ArenaContext, ArenaContextImpl, RoleFactory } from "./roles";

// You can also import your files like this:
// import {roleAttacker} from './roles/attacker.mjs';

// We can define global objects that will be valid for the entire match.
// The game guarantees there will be no global reset during the match.
// Note that you cannot assign any game objects here, since they are populated on the first tick, not when the script is initialized.
let context: ArenaContext;
let factory: RoleFactory;

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

  // Notice how getTime is a global function, but not Game.time anymore
  if (getTicks() % 10 === 0) {
    console.log(`I have ${context.myCreeps.length} creeps`);
  }

  // Run all my creeps according to their bodies
  context.myCreeps.map(c => factory.createRole(c)).forEach(it => it?.play());
}
