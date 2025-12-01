import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-2 text-center">
        Create your account
      </h1>
      <p className="text-sm text-slate-500 mb-6 text-center">
        SaaS Task Manager
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <button
  type="submit"
  disabled={loading}
  className="w-full rounded-md py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
>
  {loading ? "Creating account..." : "Sign up"}
</button>

      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-slate-900 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
