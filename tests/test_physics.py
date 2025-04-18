import pytest
import numpy as np
from backend.simulation.physics import PhysicsEngine
from backend.config import Config

config = Config()


class TestPhysicsEngine:

    def setup_method(self):
        self.physics_engine = PhysicsEngine()
        self.dt = self.physics_engine.dt

    def test_calculate_gravity_force(self):
        mass = 1000  # kg
        gravity_force = self.physics_engine.calculate_gravity_force(mass)
        assert isinstance(gravity_force, np.ndarray)
        assert gravity_force.shape == (2,)
        assert gravity_force[0] == pytest.approx(0.0)
        assert gravity_force[1] == pytest.approx(mass * self.physics_engine.gravity)

    def test_calculate_thrust_force_vector_no_throttle(self):
        throttle = 0.0
        angle_degrees = 0.0
        thrust_force = self.physics_engine.calculate_thrust_force_vector(
            throttle, angle_degrees
        )
        assert isinstance(thrust_force, np.ndarray)
        assert thrust_force.shape == (2,)
        assert thrust_force[0] == pytest.approx(0.0)
        assert thrust_force[1] == pytest.approx(0.0)

    def test_calculate_thrust_force_vector_full_throttle_vertical(self):
        throttle = 1.0
        angle_degrees = 0.0
        thrust_power = self.physics_engine.thrust_power
        thrust_force = self.physics_engine.calculate_thrust_force_vector(
            throttle, angle_degrees
        )
        assert isinstance(thrust_force, np.ndarray)
        assert thrust_force.shape == (2,)
        assert thrust_force[0] == pytest.approx(0.0)
        assert thrust_force[1] == pytest.approx(thrust_power)

    def test_calculate_thrust_force_vector_full_throttle_angled(self):
        throttle = 1.0
        angle_degrees = 45.0
        thrust_power = self.physics_engine.thrust_power
        thrust_force = self.physics_engine.calculate_thrust_force_vector(
            throttle, angle_degrees
        )
        assert isinstance(thrust_force, np.ndarray)
        assert thrust_force.shape == (2,)
        expected_force_magnitude = thrust_power * np.sin(np.deg2rad(45))
        assert thrust_force[0] == pytest.approx(expected_force_magnitude)
        assert thrust_force[1] == pytest.approx(thrust_power * np.cos(np.deg2rad(45)))

    def test_calculate_drag_force_no_velocity(self):
        state = {"vx": 0.0, "vy": 0.0}
        drag_force = self.physics_engine.calculate_drag_force(state)
        assert isinstance(drag_force, np.ndarray)
        assert drag_force.shape == (2,)
        assert drag_force[0] == pytest.approx(0.0)
        assert drag_force[1] == pytest.approx(0.0)

    def test_calculate_drag_force_with_velocity(self):
        state = {"vx": 10.0, "vy": -10.0}
        drag_force = self.physics_engine.calculate_drag_force(state)
        assert isinstance(drag_force, np.ndarray)
        assert drag_force.shape == (2,)
        assert np.linalg.norm(drag_force) > 0
        assert np.dot(drag_force, np.array([state["vx"], state["vy"]])) < 0

    def test_calculate_net_force_no_thrust_free_fall(self):
        mass = 1000.0
        throttle = 0.0
        angle = 0.0
        state = {"vx": 0.0, "vy": 0.0}
        net_force = self.physics_engine.calculate_net_force(
            mass, throttle, angle, state
        )
        gravity = self.physics_engine.calculate_gravity_force(mass)
        drag = self.physics_engine.calculate_drag_force(state)
        expected_net_force = gravity + drag
        assert np.allclose(net_force, expected_net_force)

    def test_calculate_acceleration(self):
        net_force = np.array([10.0, -20.0])
        mass = 2.0  # kg
        acceleration = self.physics_engine.calculate_acceleration(net_force, mass)
        assert isinstance(acceleration, np.ndarray)
        assert acceleration.shape == (2,)
        assert acceleration[0] == pytest.approx(net_force[0] / mass)
        assert acceleration[1] == pytest.approx(net_force[1] / mass)

    def test_update_state_verlet_vertical_motion_gravity_only(self):
        initial_state = {
            "x": 0.0,
            "y": 100.0,
            "vx": 0.0,
            "vy": 0.0,
            "ax": 0.0,
            "ay": 0.0,
            "angle": 0.0,
            "angularVelocity": 0.0,
            "angularAcceleration": 0.0,
        }
        previous_state = {
            "x": 0.0,
            "y": 100.0,
            "vx": 0.0,
            "vy": 0.0,
            "ax": 0.0,
            "ay": 0.0,
            "angle": 0.0,
            "angularVelocity": 0.0,
            "angularAcceleration": 0.0,
        }
        dt = self.dt
        current_state = initial_state.copy()
        current_state["ax"] = 0.0
        current_state["ay"] = self.physics_engine.gravity

        new_state = self.physics_engine.update_state_verlet(
            current_state, previous_state, dt
        )

        assert new_state["x"] == pytest.approx(
            initial_state["x"]
        )  # No horizontal motion
        assert new_state["y"] == pytest.approx(
            2 * initial_state["y"] - previous_state["y"] + current_state["ay"] * dt**2
        )  # Verlet position update
        assert new_state["vx"] == pytest.approx(
            (new_state["x"] - current_state["x"]) / dt
        )  # Verlet velocity update
        assert new_state["vy"] == pytest.approx(
            (new_state["y"] - current_state["y"]) / dt
        )  # Verlet velocity update

    def test_calculate_fuel_consumption(self):
        throttle = 0.5
        dt = self.dt
        fuel_consumption_rate = self.physics_engine.fuel_consumption_rate
        fuel_consumed = self.physics_engine.calculate_fuel_consumption(throttle, dt)
        assert fuel_consumed == pytest.approx(throttle * fuel_consumption_rate * dt)
