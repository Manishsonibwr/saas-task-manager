import { useEffect, useState } from "react";
import api from "../api/client";

function BillingPanel({ workspace }) {
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const hasWorkspace = !!workspace;

  // Fetch plans once (when logged in)
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      setError("");
      try {
        const res = await api.get("/billing/plans");
        setPlans(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load plans.");
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Fetch current subscription when workspace changes
  useEffect(() => {
    if (!workspace) {
      setCurrentSub(null);
      return;
    }
    const fetchSub = async () => {
      setLoadingSub(true);
      setError("");
      try {
        const res = await api.get(`/billing/current/${workspace.id}`);
        setCurrentSub(res.data); // can be null if no subscription
      } catch (err) {
        console.error(err);
        setError("Failed to load current subscription.");
      } finally {
        setLoadingSub(false);
      }
    };
    fetchSub();
  }, [workspace]);

  const handleActivatePlan = async (plan) => {
    if (!workspace) return;
    setProcessing(true);
    setError("");

    try {
      // Step 1: create "order" with backend
      const createRes = await api.post("/billing/create-order", {
        workspace_id: workspace.id,
        plan_id: plan.id,
      });

      const { order_id, amount, currency } = createRes.data;

      // If amount is 0 (Free plan), backend may already mark as active.
      if (!amount || amount === 0) {
        // Just refetch subscription
        const subRes = await api.get(`/billing/current/${workspace.id}`);
        setCurrentSub(subRes.data);
        setProcessing(false);
        return;
      }

      // For fake gateway case:
      // We simulate a successful payment and call verify-payment
      const fakePaymentId = "fake_payment_id_123";
      const fakeSignature = "fake_signature_123";

      const verifyRes = await api.post("/billing/verify-payment", {
        workspace_id: workspace.id,
        plan_id: plan.id,
        razorpay_order_id: order_id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: fakeSignature,
      });

      setCurrentSub(verifyRes.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to process plan activation. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderCurrentPlan = () => {
    if (!hasWorkspace) {
      return (
        <p className="text-xs text-slate-500">
          Select a workspace above to see its subscription.
        </p>
      );
    }

    if (loadingSub) {
      return (
        <p className="text-xs text-slate-500">
          Loading current subscription...
        </p>
      );
    }

    if (!currentSub) {
      return (
        <p className="text-xs text-slate-500">
          No active subscription yet. This workspace is on the default free tier.
        </p>
      );
    }

    const plan = currentSub.plan;

    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-md px-3 py-2 text-xs text-emerald-800">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold">
              Current plan: {plan.name}
            </p>
            {plan.description && (
              <p className="text-[11px]">
                {plan.description}
              </p>
            )}
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
            {currentSub.status.toUpperCase()}
          </span>
        </div>
        {currentSub.current_period_start && currentSub.current_period_end && (
          <p className="mt-1 text-[11px]">
            Valid from{" "}
            {new Date(currentSub.current_period_start).toLocaleDateString()} to{" "}
            {new Date(currentSub.current_period_end).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 bg-slate-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Billing & Subscription
          </h2>
          <p className="text-xs text-slate-500">
            Manage plans for the selected workspace.
          </p>
        </div>
        {workspace && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Workspace: {workspace.name}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-700 mb-1">
          Current plan
        </h3>
        {renderCurrentPlan()}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-700 mb-2">
          Available plans
        </h3>

        {loadingPlans ? (
          <p className="text-xs text-slate-500">Loading plans...</p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-slate-500">
            No plans configured yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plans.map((plan) => {
              const isCurrent =
                currentSub && currentSub.plan && currentSub.plan.id === plan.id;

              const priceLabel =
                Number(plan.price_per_month) === 0
                  ? "Free"
                  : `₹${Number(plan.price_per_month).toFixed(0)}/month`;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg bg-white px-3 py-3 text-xs flex flex-col justify-between ${
                    isCurrent
                      ? "border-emerald-400 shadow-sm"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-semibold text-slate-800">
                        {plan.name}
                      </h4>
                      <span className="text-[11px] font-medium">
                        {priceLabel}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-[11px] text-slate-500 mb-1">
                        {plan.description}
                      </p>
                    )}
                    <ul className="text-[11px] text-slate-600 space-y-0.5">
                      {plan.max_projects && (
                        <li>Up to {plan.max_projects} projects</li>
                      )}
                      {plan.max_tasks && (
                        <li>Up to {plan.max_tasks} tasks</li>
                      )}
                      {plan.max_members && (
                        <li>Up to {plan.max_members} members</li>
                      )}
                      {!plan.max_projects &&
                        !plan.max_tasks &&
                        !plan.max_members && (
                          <li>Usage limits not defined</li>
                        )}
                    </ul>
                  </div>

                  <div className="mt-3 flex justify-end">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="text-[11px] px-3 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        Current plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={processing || !workspace}
                        onClick={() => handleActivatePlan(plan)}
                        className="text-[11px] px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {processing
                          ? "Processing..."
                          : workspace
                          ? "Choose this plan"
                          : "Select a workspace"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BillingPanel;
