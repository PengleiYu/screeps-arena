import { Creep, GameObject } from "game/prototypes";
import { Flag } from "arena";
import { Visual } from "game/visual";
import { getDirection, getObjectsByPrototype, getRange } from "game/utils";
import { searchPath } from "game/path-finder";
import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";

declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
  }
}

export class RoleFactory {
  constructor(private context: ArenaContext) {}

  public createRole(creep: Creep): Role | null {
    if (Soldier.canPlay(creep)) {
      return new Soldier(creep, this.context);
    } else if (Archer.canPlay(creep)) {
      return new Archer(creep, this.context);
    } else if (Priest.canPlay(creep)) {
      return new Priest(creep, this.context);
    } else {
      return null;
    }
  }
}

export abstract class Role {
  public constructor(protected creep: Creep, protected context: ArenaContext) {}

  abstract play(): void;
}

class Soldier extends Role {
  public static canPlay(creep: Creep): boolean {
    return creep.body.some(i => i.type === ATTACK);
  }

  play(): void {
    this.attack();
  }

  public attack() {
    // Here is the alternative to the creep "memory" from Screeps World. All game objects are persistent. You can assign any property to it once, and it will be available during the entire match.
    let creep = this.creep;
    let enemyCreeps = this.context.enemyCreeps;
    if (!creep.initialPos) {
      creep.initialPos = { x: creep.x, y: creep.y };
    }

    new Visual().text(
      creep.hits.toString(),
      { x: creep.x, y: creep.y - 0.5 }, // above the creep
      {
        font: "0.5",
        opacity: 0.7,
        backgroundColor: "#808080",
        backgroundPadding: 0.03
      }
    );
    const targets = enemyCreeps
      .filter(i => getRange(i, creep.initialPos) < 10)
      .sort((a, b) => getRange(a, creep) - getRange(b, creep));

    if (targets.length > 0) {
      creep.moveTo(targets[0]);
      creep.attack(targets[0]);
    } else {
      creep.moveTo(creep.initialPos);
    }
  }
}

class Archer extends Role {
  public static canPlay(creep: Creep): boolean {
    return creep.body.some(i => i.type === RANGED_ATTACK);
  }

  play(): void {
    this.shoot();
  }

  private shoot() {
    let creep = this.creep;
    let context = this.context;
    const targets = context.enemyCreeps.sort((a, b) => getRange(a, creep) - getRange(b, creep));
    if (targets.length > 0) {
      creep.rangedAttack(targets[0]);
    }

    if (context.enemyFlag) {
      creep.moveTo(context.enemyFlag);
    }

    const range = 3;
    const enemiesInRange = context.enemyCreeps.filter(i => getRange(i, creep) < range);
    if (enemiesInRange.length > 0) {
      flee(creep, enemiesInRange, range);
    }
  }
}

class Priest extends Role {
  public static canPlay(creep: Creep): boolean {
    return creep.body.some(i => i.type === HEAL);
  }

  play(): void {
    this.heal();
  }

  private heal() {
    let context = this.context;
    let creep = this.creep;

    const targets = context.myCreeps.filter(i => i !== creep && i.hits < i.hitsMax).sort((a, b) => a.hits - b.hits);

    if (targets.length) {
      creep.moveTo(targets[0]);
    } else {
      if (context.enemyFlag) {
        creep.moveTo(context.enemyFlag);
      }
    }

    const healTargets = context.myCreeps.filter(i => getRange(i, creep) <= 3).sort((a, b) => a.hits - b.hits);

    if (healTargets.length > 0) {
      if (getRange(healTargets[0], creep) === 1) {
        creep.heal(healTargets[0]);
      } else {
        creep.rangedHeal(healTargets[0]);
      }
    }

    const range = 7;
    const enemiesInRange = context.enemyCreeps.filter(i => getRange(i, creep) < range);
    if (enemiesInRange.length > 0) {
      flee(creep, enemiesInRange, range);
    }

    if (context.enemyFlag) {
      creep.moveTo(context.enemyFlag);
    }
  }
}

function flee(creep: Creep, targets: GameObject[], range: number) {
  const result = searchPath(
    creep,
    targets.map(i => ({ pos: i, range })),
    { flee: true }
  );
  if (result.path.length > 0) {
    const direction = getDirection(result.path[0].x - creep.x, result.path[0].y - creep.y);
    creep.move(direction);
  }
}

export interface ArenaContext {
  myCreeps: Creep[];
  enemyCreeps: Creep[];
  enemyFlag: Flag | undefined;
}

export class ArenaContextImpl implements ArenaContext {
  get myCreeps(): Creep[] {
    return getObjectsByPrototype(Creep).filter(i => i.my);
  }

  get enemyFlag(): Flag | undefined {
    return getObjectsByPrototype(Flag).find(i => !i.my);
  }

  get enemyCreeps(): Creep[] {
    return getObjectsByPrototype(Creep).filter(i => !i.my);
  }
}
