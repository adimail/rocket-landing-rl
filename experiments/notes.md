# Controls

- A positive `cold_gas` value (e.g., 1.0) induces counter-clockwise angular acceleration (Rotate Left).
- A negative `cold_gas` value (e.g., -1.0) induces clockwise angular acceleration (Rotate Right).

# Verlet Integration

- Implemented Verlet integration in `PhysicsEngine` for more accurate and stable physics simulation.
- Modified `Rocket` and `RocketControls` to support Verlet integration, including storing and updating previous state.

# RL

- **Observation Space**: Rocket state (position, velocity, angle, fuel, etc.).
- **Action Space**: Throttle (continuous [0, 1]), Cold Gas Control (continuous [-1, 1]).
- **Reward Function**: Design a reward function that encourages safe and efficient landing. (current reward is basic, needs refinement).
- **RL Agent**: Integrate an RL agent (e.g., using a library like stable-baselines3) to control throttle and cold gas based on the rocket state.
