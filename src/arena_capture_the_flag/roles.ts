import { Creep, GameObject } from "game/prototypes";
import { Visual } from "game/visual";
import { getDirection, getObjectsByPrototype, getRange } from "game/utils";
import { searchPath } from "game/path-finder";
import { ATTACK, HEAL, RANGED_ATTACK } from "game/constants";
import { Flag } from "arena";

declare module "game/prototypes" {
  interface Creep {
    initialPos: RoomPosition;
  }
}

export class RoleFactory {
  constructor(private context: ArenaContext) {}

  public createRole(creep: Creep): Role {
    if (Soldier.canPlay(creep)) {
      return new Soldier(creep, this.context);
    } else if (Archer.canPlay(creep)) {
      return new Archer(creep, this.context);
    } else if (Priest.canPlay(creep)) {
      return new Priest(creep, this.context);
    } else {
      let typeArr = creep.body.map(it => it.type);
      throw new Error(`无法处理的creep:${typeArr}`);
    }
  }
}

export abstract class Role {
  private _positive: boolean = false;
  set positive(positive: boolean) {
    this._positive = positive;
  }

  get positive(): boolean {
    return this._positive;
  }

  public constructor(protected creep: Creep, protected context: ArenaContext) {
    if (!creep.initialPos) {
      creep.initialPos = { x: creep.x, y: creep.y };
    }
  }

  public play(): void {
    this.work();
    this.positive ? this.gotoEnemyHome() : this.stayHome();
  }

  abstract work(): void;

  protected stayHome(): void {
    this.creep.moveTo(this.creep.initialPos);
  }

  protected gotoEnemyHome(): void {
    this.creep.moveTo(this.context.enemyFlag);
  }
}

class Soldier extends Role {
  public static canPlay(creep: Creep): boolean {
    return creep.body.some(i => i.type === ATTACK);
  }

  work(): void {
    this.attackNearby();
  }

  public attackNearby() {
    // Here is the alternative to the creep "memory" from Screeps World. All game objects are persistent. You can assign any property to it once, and it will be available during the entire match.
    let creep = this.creep;
    let enemyCreeps = this.context.enemyCreeps;

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
    let creepsNearby = enemyCreeps.filter(i => getRange(i, creep.initialPos) < 10);

    if (creepsNearby.length > 0) {
      let target = creepsNearby.sort((a, b) => getRange(a, creep) - getRange(b, creep))[0];
      creep.moveTo(target);
      creep.attack(target);
      return;
    }
  }
}

class Archer extends Role {
  public static canPlay(creep: Creep): boolean {
    return creep.body.some(i => i.type === RANGED_ATTACK);
  }

  work(): void {
    this.shoot();
  }

  private shoot() {
    let creep = this.creep;
    let context = this.context;
    const targets = context.enemyCreeps.sort((a, b) => getRange(a, creep) - getRange(b, creep));
    if (targets.length > 0) {
      creep.rangedAttack(targets[0]);
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

  work(): void {
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
  enemyFlag: Flag;
  myFlag: Flag;
}

export class ArenaContextImpl implements ArenaContext {
  get myFlag(): Flag {
    return getObjectsByPrototype(Flag).find(i => i.my)!!;
  }

  get myCreeps(): Creep[] {
    return getObjectsByPrototype(Creep).filter(i => i.my);
  }

  get enemyFlag(): Flag {
    return getObjectsByPrototype(Flag).find(i => !i.my)!!;
  }

  get enemyCreeps(): Creep[] {
    return getObjectsByPrototype(Creep).filter(i => !i.my);
  }
}
