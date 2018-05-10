import { State, Action, StateContext, Selector } from '@ngxs/store';

export interface IRegistryStateModel {
  /**
   * Stored nodes against keys when consumers use SpotlightTarget
   */
  stored: { [key: string]: HTMLElement };

  /**
   * All mounted spotlights (whether with or without SpotlightTarget), used to display Blanket etc.
   */
  mounted: Array<HTMLElement>;
}

export class AddSpotlight {
  static readonly type = '[Registry] Add spotlight';
  constructor(public name: string, public node: HTMLElement) {}
}

export class RemoveSpotlight {
  static readonly type = '[Registry] Remove spotlight';
  constructor(public name: string) {}
}

export class MountSpotlight {
  static readonly type = '[Registry] Mount spotlight';
  constructor(public node: HTMLElement) {}
}

export class UnmountSpotlight {
  static readonly type = '[Registry] Unmount spotlight';
  constructor(public node: HTMLElement) {}
}

@State<IRegistryStateModel>({
  name: 'registry',
  defaults: {
    stored: {},
    mounted: []
  }
})
export class RegistryState {
  @Selector()
  static hasMounted(state: IRegistryStateModel) {
    return Boolean(state.mounted.length);
  }

  @Selector()
  static countMounted(state: IRegistryStateModel) {
    return state.mounted.length;
  }

  @Action(AddSpotlight)
  add(ctx: StateContext<IRegistryStateModel>, action: AddSpotlight) {
    const state = ctx.getState();

    if (state.stored[action.name]) {
      console.warn(`SpotlightRegistry already has an entry for "${name}".`);
      return;
    }

    ctx.setState({
      ...state,
      stored: { ...state.stored, [action.name]: action.node }
    });
  }

  @Action(RemoveSpotlight)
  remove(ctx: StateContext<IRegistryStateModel>, action: RemoveSpotlight) {
    const state = ctx.getState();

    if (!state.stored[action.name]) {
      console.warn(`SpotlightRegistry has no entry for "${name}".`); // eslint-disable-line no-console
      return;
    }

    delete state.stored[action.name];

    ctx.setState({
      ...state
    });
  }

  @Action(MountSpotlight)
  mount(ctx: StateContext<IRegistryStateModel>, action: MountSpotlight) {
    const state = ctx.getState();
    const mounted = state.mounted.slice(0);
    mounted.push(action.node);

    ctx.setState({
      ...state,
      mounted
    });
  }

  @Action(MountSpotlight)
  unmount(ctx: StateContext<IRegistryStateModel>, action: UnmountSpotlight) {
    const state = ctx.getState();
    const mounted = state.mounted.slice(0).filter(i => action.node !== i);

    ctx.setState({
      ...state,
      mounted
    });
  }
}
