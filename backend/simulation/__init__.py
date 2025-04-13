from backend.simulation.physics.engine import RocketSimulator


class SimulationController:
    def __init__(self):
        try:
            self.sim = RocketSimulator()
            self.paused = True
            self.done = False
            self.time = 0.0
        except Exception as e:
            raise Exception(f"Failed to initialize SimulationController: {e}")

    def reset(self):
        try:
            state = self.sim.reset()
            self.paused = True
            self.done = False
            self.time = 0.0
            return state
        except Exception as e:
            raise Exception(f"Simulation reset failed: {e}")

    def start(self):
        try:
            self.paused = False
        except Exception as e:
            raise Exception(f"Simulation start failed: {e}")

    def pause(self):
        try:
            self.paused = True
        except Exception as e:
            raise Exception(f"Simulation pause failed: {e}")

    def step(self, action=(0.0, 0.0)):
        try:
            if self.paused or self.done:
                state = self.sim.rocket.get_state()
                return state, 0.0, self.done

            state, reward, sim_done = self.sim.step(action)
            self.time += self.sim.dt
            self.done = sim_done
            return state, reward, self.done
        except Exception as e:
            raise Exception(f"Simulation step failed: {e}")

    def render(self):
        try:
            return self.sim.rocket.get_state()
        except Exception as e:
            raise Exception(f"Simulation render failed: {e}")
