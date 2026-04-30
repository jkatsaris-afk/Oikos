import { Info, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../auth/useAuth";
import {
  fetchOrganizationAccess,
  updateOrganizationSettings,
} from "../../../core/settings/organizationAccessService";

function getTwilioSettings(account) {
  return account?.integrations?.twilio || {};
}

function getPaymentSettings(account) {
  return account?.integrations?.payments || {};
}

function getEmailSettings(account) {
  return account?.integrations?.email || {};
}

const SYSTEM_EMAIL_GUIDANCE = [
  "Supabase Auth still handles system emails like password resets and account auth flows.",
  "Campus integrations below are for parent communication, teacher portal communication, texting, and tuition payments.",
];

const EMAIL_PROVIDER_GUIDANCE = [
  {
    id: "resend",
    label: "Resend",
    cost: "Free 3,000 emails/mo with 100/day. Pro starts at $20/mo for 50,000 emails.",
    bestFor: "Fastest setup and easiest first provider for schools that want simple API-based sending.",
    setup: [
      "Create a Resend account.",
      "Verify a sending domain.",
      "Create an API key.",
      "Set your From Name, From Email, and optional Reply-To.",
    ],
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    cost: "Free trial with 100 emails/day for 60 days. Paid Email API plans start at $19.95/mo.",
    bestFor: "Organizations that want a widely used email platform with templates and analytics.",
    setup: [
      "Create a SendGrid account.",
      "Set up a sender identity or authenticated domain.",
      "Create an API key with mail send access.",
      "Use the same sender details in Oikos.",
    ],
  },
  {
    id: "mailgun",
    label: "Mailgun",
    cost: "Foundation starts at $35/mo with 50,000 emails included. Extra emails from $1.30 to $1.80 per 1,000 depending on plan.",
    bestFor: "Teams that want strong developer tooling, inbound mail options, and higher-volume growth paths.",
    setup: [
      "Create a Mailgun account.",
      "Add and verify your sending domain.",
      "Create an API key.",
      "Enter your Mailgun domain and choose US or EU region.",
    ],
  },
  {
    id: "postmark",
    label: "Postmark",
    cost: "Basic starts at $15/mo for 10,000 emails. Pro starts at $16.50/mo with lower overage pricing.",
    bestFor: "Transactional email with strong deliverability and clean monthly plans.",
    setup: [
      "Create a Postmark server.",
      "Verify a sender signature or domain.",
      "Copy the server token.",
      "Use the outbound message stream unless you intentionally separate streams.",
    ],
  },
];

const TEXT_PROVIDER_GUIDANCE = [
  {
    id: "twilio",
    label: "Twilio",
    cost: "US outbound SMS starts at $0.0083 per segment, plus number fees and carrier fees. Long code numbers start around $1.15/mo.",
    bestFor: "Parent texting, urgent alerts, and future teacher-to-parent texting from the portal.",
    setup: [
      "Create a Twilio account.",
      "Buy a messaging-capable number or set up a Messaging Service.",
      "Copy Account SID and Auth Token.",
      "If you text US families at scale, complete A2P 10DLC registration.",
    ],
  },
];

const PAYMENT_PROVIDER_GUIDANCE = [
  {
    id: "stripe",
    label: "Stripe",
    cost: "Standard online card pricing starts at 2.9% + 30c per successful domestic transaction.",
    bestFor: "Best all-around fit for tuition payments, payment links, subscriptions, and future deeper billing automation.",
    setup: [
      "Create a Stripe account.",
      "Complete business verification and connect your bank account.",
      "Create Payment Links or use Checkout.",
      "If you want deeper automation later, add API keys and webhook secret.",
    ],
  },
  {
    id: "square",
    label: "Square",
    cost: "Square Payment Links have no monthly fee and are 3.3% + 30c per online transaction.",
    bestFor: "Simple tuition or fee collection when you want easy dashboard setup without much technical work.",
    setup: [
      "Create a Square account.",
      "Connect your bank account.",
      "Create a payment link from Square Dashboard.",
      "Paste the hosted link into Oikos for families to use.",
    ],
  },
];

function GuidanceCard({ title, cost, bestFor, setup = [] }) {
  return (
    <div style={styles.guidanceCard}>
      <div style={styles.guidanceTitle}>{title}</div>
      <div style={styles.guidanceMetaLabel}>Typical Cost</div>
      <div style={styles.guidanceText}>{cost}</div>
      <div style={styles.guidanceMetaLabel}>Best For</div>
      <div style={styles.guidanceText}>{bestFor}</div>
      <div style={styles.guidanceMetaLabel}>Setup</div>
      <div style={styles.guidanceSteps}>
        {setup.map((step) => (
          <div key={step} style={styles.guidanceStep}>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderGuideToggle({ isOpen, onToggle }) {
  return (
    <button type="button" style={styles.providerToggleButton} onClick={onToggle}>
      <Info size={16} />
      {isOpen ? "Hide Providers" : "Providers"}
    </button>
  );
}

export default function CampusIntegrationsSettingsPanel() {
  const { user } = useAuth();
  const [state, setState] = useState({
    account: null,
    isOwner: false,
    membership: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openProviderGuides, setOpenProviderGuides] = useState({
    email: false,
    text: false,
    payments: false,
  });
  const [form, setForm] = useState({
    enabled: false,
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    messagingServiceSid: "",
    parentNotificationsEnabled: true,
  });
  const [paymentForm, setPaymentForm] = useState({
    enabled: false,
    provider: "stripe",
    tuitionPaymentsEnabled: true,
    paymentLinkUrl: "",
    publicKey: "",
    secretKey: "",
    webhookSigningSecret: "",
    squareApplicationId: "",
    squareLocationId: "",
    notes: "",
  });
  const [emailForm, setEmailForm] = useState({
    enabled: false,
    provider: "resend",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    parentNotificationsEnabled: true,
    resendApiKey: "",
    sendgridApiKey: "",
    mailgunApiKey: "",
    mailgunDomain: "",
    mailgunRegion: "us",
    postmarkServerToken: "",
    postmarkMessageStream: "outbound",
  });

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const nextState = await fetchOrganizationAccess(user.id, "campus");
        if (!mounted) return;

        setState(nextState);
        const twilio = getTwilioSettings(nextState.account);
        const payments = getPaymentSettings(nextState.account);
        const email = getEmailSettings(nextState.account);
        setForm({
          enabled: twilio.enabled === true,
          accountSid: twilio.accountSid || "",
          authToken: twilio.authToken || "",
          phoneNumber: twilio.phoneNumber || "",
          messagingServiceSid: twilio.messagingServiceSid || "",
          parentNotificationsEnabled: twilio.parentNotificationsEnabled !== false,
        });
        setPaymentForm({
          enabled: payments.enabled === true,
          provider: payments.provider || "stripe",
          tuitionPaymentsEnabled: payments.tuitionPaymentsEnabled !== false,
          paymentLinkUrl: payments.paymentLinkUrl || "",
          publicKey: payments.publicKey || "",
          secretKey: payments.secretKey || "",
          webhookSigningSecret: payments.webhookSigningSecret || "",
          squareApplicationId: payments.squareApplicationId || "",
          squareLocationId: payments.squareLocationId || "",
          notes: payments.notes || "",
        });
        setEmailForm({
          enabled: email.enabled === true,
          provider: email.provider || "resend",
          fromName: email.fromName || "",
          fromEmail: email.fromEmail || "",
          replyToEmail: email.replyToEmail || "",
          parentNotificationsEnabled: email.parentNotificationsEnabled !== false,
          resendApiKey: email.resendApiKey || "",
          sendgridApiKey: email.sendgridApiKey || "",
          mailgunApiKey: email.mailgunApiKey || "",
          mailgunDomain: email.mailgunDomain || "",
          mailgunRegion: email.mailgunRegion || "us",
          postmarkServerToken: email.postmarkServerToken || "",
          postmarkMessageStream: email.postmarkMessageStream || "outbound",
        });
      } catch (loadError) {
        console.error("Campus integrations load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load integrations.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function handleSave() {
    if (!state.account?.id || !state.isOwner) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const nextAccount = await updateOrganizationSettings(state.account.id, {
        integrations: {
          ...(state.account?.integrations || {}),
          twilio: {
            enabled: form.enabled,
            accountSid: form.accountSid.trim(),
            authToken: form.authToken.trim(),
            phoneNumber: form.phoneNumber.trim(),
            messagingServiceSid: form.messagingServiceSid.trim(),
            parentNotificationsEnabled: form.parentNotificationsEnabled,
          },
        },
      });

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Twilio settings saved.");
    } catch (saveError) {
      console.error("Campus integrations save error:", saveError);
      setError(saveError?.message || "Could not save Twilio settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePayments() {
    if (!state.account?.id || !state.isOwner) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const nextAccount = await updateOrganizationSettings(state.account.id, {
        integrations: {
          ...(state.account?.integrations || {}),
          payments: {
            enabled: paymentForm.enabled,
            provider: paymentForm.provider,
            tuitionPaymentsEnabled: paymentForm.tuitionPaymentsEnabled,
            paymentLinkUrl: paymentForm.paymentLinkUrl.trim(),
            publicKey: paymentForm.publicKey.trim(),
            secretKey: paymentForm.secretKey.trim(),
            webhookSigningSecret: paymentForm.webhookSigningSecret.trim(),
            squareApplicationId: paymentForm.squareApplicationId.trim(),
            squareLocationId: paymentForm.squareLocationId.trim(),
            notes: paymentForm.notes.trim(),
          },
        },
      });

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Payment settings saved.");
    } catch (saveError) {
      console.error("Campus payment integrations save error:", saveError);
      setError(saveError?.message || "Could not save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmail() {
    if (!state.account?.id || !state.isOwner) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const nextAccount = await updateOrganizationSettings(state.account.id, {
        integrations: {
          ...(state.account?.integrations || {}),
          email: {
            enabled: emailForm.enabled,
            provider: emailForm.provider || "resend",
            fromName: emailForm.fromName.trim(),
            fromEmail: emailForm.fromEmail.trim(),
            replyToEmail: emailForm.replyToEmail.trim(),
            parentNotificationsEnabled: emailForm.parentNotificationsEnabled,
            resendApiKey: emailForm.resendApiKey.trim(),
            sendgridApiKey: emailForm.sendgridApiKey.trim(),
            mailgunApiKey: emailForm.mailgunApiKey.trim(),
            mailgunDomain: emailForm.mailgunDomain.trim(),
            mailgunRegion: emailForm.mailgunRegion,
            postmarkServerToken: emailForm.postmarkServerToken.trim(),
            postmarkMessageStream: emailForm.postmarkMessageStream.trim() || "outbound",
          },
        },
      });

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Email settings saved.");
    } catch (saveError) {
      console.error("Campus email integrations save error:", saveError);
      setError(saveError?.message || "Could not save email settings.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProviderGuide(key) {
    setOpenProviderGuides((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  if (loading) {
    return <div style={styles.emptyState}>Loading integrations...</div>;
  }

  if (!state.account) {
    return (
      <div style={styles.emptyState}>
        Connect a campus organization first before setting up Twilio.
      </div>
    );
  }

  if (!state.isOwner) {
    return (
      <div style={styles.emptyState}>
        Only organization owners can manage Twilio settings for parent notifications.
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <section style={styles.hero}>
        <div>
          <div style={styles.title}>Integrations</div>
          <div style={styles.subtitle}>
            Set up organization-wide services for campus operations. These settings belong
            to the organization, so every campus user works from the same shared setup.
          </div>
        </div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <section style={styles.card}>
        <div style={styles.sectionHeading}>System Email vs Campus Messaging</div>
        <div style={styles.guidanceInlineList}>
          {SYSTEM_EMAIL_GUIDANCE.map((item) => (
            <div key={item} style={styles.guidanceInlineItem}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeading}>Email</div>
        <div style={styles.sectionSubtext}>
          Set up organization-wide email sending for parent communication. Resend is the fastest first integration for transactional email from the app.
        </div>

        <div style={styles.providerToggleRow}>
          <ProviderGuideToggle
            isOpen={openProviderGuides.email}
            onToggle={() => toggleProviderGuide("email")}
          />
        </div>

        {openProviderGuides.email ? (
          <div style={styles.guidanceGrid}>
            {EMAIL_PROVIDER_GUIDANCE.map((provider) => (
              <GuidanceCard
                key={provider.id}
                title={provider.label}
                cost={provider.cost}
                bestFor={provider.bestFor}
                setup={provider.setup}
              />
            ))}
          </div>
        ) : null}

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={emailForm.enabled}
            onChange={(event) =>
              setEmailForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Enable Email Sending</div>
            <div style={styles.toggleText}>Turn on in-app email for this campus organization.</div>
          </div>
        </label>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Provider</span>
            <select
              value={emailForm.provider}
              onChange={(event) =>
                setEmailForm((current) => ({ ...current, provider: event.target.value }))
              }
              style={styles.input}
            >
              <option value="resend">Resend (Recommended)</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="postmark">Postmark</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>From Name</span>
            <input
              type="text"
              value={emailForm.fromName}
              onChange={(event) =>
                setEmailForm((current) => ({ ...current, fromName: event.target.value }))
              }
              style={styles.input}
              placeholder="Test School"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>From Email</span>
            <input
              type="email"
              value={emailForm.fromEmail}
              onChange={(event) =>
                setEmailForm((current) => ({ ...current, fromEmail: event.target.value }))
              }
              style={styles.input}
              placeholder="office@yourschool.org"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Reply-To Email</span>
            <input
              type="email"
              value={emailForm.replyToEmail}
              onChange={(event) =>
                setEmailForm((current) => ({ ...current, replyToEmail: event.target.value }))
              }
              style={styles.input}
              placeholder="registrar@yourschool.org"
            />
          </label>
        </div>

        {emailForm.provider === "resend" ? (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Resend API Key</span>
              <input
                type="password"
                value={emailForm.resendApiKey}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, resendApiKey: event.target.value }))
                }
                style={styles.input}
                placeholder="re_..."
              />
            </label>
          </div>
        ) : null}

        {emailForm.provider === "sendgrid" ? (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>SendGrid API Key</span>
              <input
                type="password"
                value={emailForm.sendgridApiKey}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, sendgridApiKey: event.target.value }))
                }
                style={styles.input}
                placeholder="SG...."
              />
            </label>
          </div>
        ) : null}

        {emailForm.provider === "mailgun" ? (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Mailgun API Key</span>
              <input
                type="password"
                value={emailForm.mailgunApiKey}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, mailgunApiKey: event.target.value }))
                }
                style={styles.input}
                placeholder="key-..."
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Mailgun Domain</span>
              <input
                type="text"
                value={emailForm.mailgunDomain}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, mailgunDomain: event.target.value }))
                }
                style={styles.input}
                placeholder="mg.yourschool.org"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Mailgun Region</span>
              <select
                value={emailForm.mailgunRegion}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, mailgunRegion: event.target.value }))
                }
                style={styles.input}
              >
                <option value="us">US</option>
                <option value="eu">EU</option>
              </select>
            </label>
          </div>
        ) : null}

        {emailForm.provider === "postmark" ? (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Postmark Server Token</span>
              <input
                type="password"
                value={emailForm.postmarkServerToken}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, postmarkServerToken: event.target.value }))
                }
                style={styles.input}
                placeholder="Server token"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Message Stream</span>
              <input
                type="text"
                value={emailForm.postmarkMessageStream}
                onChange={(event) =>
                  setEmailForm((current) => ({ ...current, postmarkMessageStream: event.target.value }))
                }
                style={styles.input}
                placeholder="outbound"
              />
            </label>
          </div>
        ) : null}

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={emailForm.parentNotificationsEnabled}
            onChange={(event) =>
              setEmailForm((current) => ({
                ...current,
                parentNotificationsEnabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Parent Email Notifications</div>
            <div style={styles.toggleText}>
              Keep this on if staff and teachers should be able to email parents from the system.
            </div>
          </div>
        </label>

        <div style={styles.helper}>
          Supabase still handles your auth/system emails like password resets and account emails. This provider setup is for Campus and Teacher Portal communication sends.
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.saveButton} onClick={handleSaveEmail} disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Email Settings"}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeading}>Twilio</div>
        <div style={styles.sectionSubtext}>
          Set up org-wide texting for parent notifications.
        </div>

        <div style={styles.providerToggleRow}>
          <ProviderGuideToggle
            isOpen={openProviderGuides.text}
            onToggle={() => toggleProviderGuide("text")}
          />
        </div>

        {openProviderGuides.text ? (
          <div style={styles.guidanceGrid}>
            {TEXT_PROVIDER_GUIDANCE.map((provider) => (
              <GuidanceCard
                key={provider.id}
                title={provider.label}
                cost={provider.cost}
                bestFor={provider.bestFor}
                setup={provider.setup}
              />
            ))}
          </div>
        ) : null}

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Enable Twilio</div>
            <div style={styles.toggleText}>Turn on text messaging for this campus organization.</div>
          </div>
        </label>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Twilio Account SID</span>
            <input
              type="text"
              value={form.accountSid}
              onChange={(event) =>
                setForm((current) => ({ ...current, accountSid: event.target.value }))
              }
              style={styles.input}
              placeholder="AC..."
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Twilio Auth Token</span>
            <input
              type="password"
              value={form.authToken}
              onChange={(event) =>
                setForm((current) => ({ ...current, authToken: event.target.value }))
              }
              style={styles.input}
              placeholder="Auth token"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Twilio Phone Number</span>
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, phoneNumber: event.target.value }))
              }
              style={styles.input}
              placeholder="+15555555555"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Messaging Service SID</span>
            <input
              type="text"
              value={form.messagingServiceSid}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  messagingServiceSid: event.target.value,
                }))
              }
              style={styles.input}
              placeholder="MG..."
            />
          </label>
        </div>

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={form.parentNotificationsEnabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                parentNotificationsEnabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Parent Notifications</div>
            <div style={styles.toggleText}>
              Keep this on if you want Twilio available for parent-facing texting workflows.
            </div>
          </div>
        </label>

        <div style={styles.helper}>
          This stores your Twilio credentials at the organization level. The actual message
          sending workflows can now hook into this shared setup later.
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.saveButton} onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Twilio Settings"}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeading}>Tuition Payments</div>
        <div style={styles.sectionSubtext}>
          Stripe is recommended because it supports hosted payment links, recurring billing,
          branding, and mobile-ready checkout with minimal setup. Square is also a strong
          option if you prefer its dashboard-first payment link flow.
        </div>

        <div style={styles.providerToggleRow}>
          <ProviderGuideToggle
            isOpen={openProviderGuides.payments}
            onToggle={() => toggleProviderGuide("payments")}
          />
        </div>

        {openProviderGuides.payments ? (
          <div style={styles.guidanceGrid}>
            {PAYMENT_PROVIDER_GUIDANCE.map((provider) => (
              <GuidanceCard
                key={provider.id}
                title={provider.label}
                cost={provider.cost}
                bestFor={provider.bestFor}
                setup={provider.setup}
              />
            ))}
          </div>
        ) : null}

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={paymentForm.enabled}
            onChange={(event) =>
              setPaymentForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Enable Payment Integration</div>
            <div style={styles.toggleText}>
              Turn on organization-wide tuition payment setup.
            </div>
          </div>
        </label>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Provider</span>
            <select
              value={paymentForm.provider}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, provider: event.target.value }))
              }
              style={styles.input}
            >
              <option value="stripe">Stripe (Recommended)</option>
              <option value="square">Square</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Hosted Payment Link</span>
            <input
              type="text"
              value={paymentForm.paymentLinkUrl}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, paymentLinkUrl: event.target.value }))
              }
              style={styles.input}
              placeholder="https://buy.stripe.com/... or Square payment link"
            />
          </label>
        </div>

        {paymentForm.provider === "stripe" ? (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Stripe Publishable Key</span>
              <input
                type="text"
                value={paymentForm.publicKey}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, publicKey: event.target.value }))
                }
                style={styles.input}
                placeholder="pk_..."
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Stripe Secret Key</span>
              <input
                type="password"
                value={paymentForm.secretKey}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, secretKey: event.target.value }))
                }
                style={styles.input}
                placeholder="sk_..."
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Webhook Signing Secret</span>
              <input
                type="password"
                value={paymentForm.webhookSigningSecret}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    webhookSigningSecret: event.target.value,
                  }))
                }
                style={styles.input}
                placeholder="whsec_..."
              />
            </label>
          </div>
        ) : (
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Square Application ID</span>
              <input
                type="text"
                value={paymentForm.squareApplicationId}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    squareApplicationId: event.target.value,
                  }))
                }
                style={styles.input}
                placeholder="sq0idp-..."
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Square Location ID</span>
              <input
                type="text"
                value={paymentForm.squareLocationId}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    squareLocationId: event.target.value,
                  }))
                }
                style={styles.input}
                placeholder="Location ID"
              />
            </label>
          </div>
        )}

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={paymentForm.tuitionPaymentsEnabled}
            onChange={(event) =>
              setPaymentForm((current) => ({
                ...current,
                tuitionPaymentsEnabled: event.target.checked,
              }))
            }
          />
          <div>
            <div style={styles.toggleTitle}>Tuition Payments</div>
            <div style={styles.toggleText}>
              Keep this on if families should be able to pay tuition through your chosen provider.
            </div>
          </div>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Internal Notes</span>
          <textarea
            value={paymentForm.notes}
            onChange={(event) =>
              setPaymentForm((current) => ({ ...current, notes: event.target.value }))
            }
            style={styles.textarea}
            placeholder="Billing contact, dashboard notes, payout reminders, or setup steps."
          />
        </label>

        <div style={styles.helper}>
          This stores your payment configuration at the organization level. The actual tuition
          payment workflows and student-family payment posting can hook into this shared setup next.
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.saveButton}
            onClick={handleSavePayments}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Payment Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  hero: {
    background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 90%, white 10%) 0%, var(--color-primary-dark) 100%)",
    borderRadius: 24,
    color: "#ffffff",
    padding: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: 900,
  },
  sectionHeading: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 900,
  },
  sectionSubtext: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.7,
    marginTop: 8,
    maxWidth: 760,
    opacity: 0.92,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
  },
  guidanceGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  providerToggleRow: {
    display: "flex",
    justifyContent: "flex-start",
  },
  providerToggleButton: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 10%, white 90%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 18%, #d8e4e0 82%)",
    borderRadius: 999,
    color: "color-mix(in srgb, var(--color-primary) 78%, #334155 22%)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
  },
  guidanceCard: {
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 8%, white 92%) 0%, #ffffff 100%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 18%, #d8e4e0 82%)",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
  },
  guidanceTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 900,
  },
  guidanceMetaLabel: {
    color: "color-mix(in srgb, var(--color-primary) 72%, #334155 28%)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginTop: 4,
    textTransform: "uppercase",
  },
  guidanceText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.65,
  },
  guidanceSteps: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  guidanceStep: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.65,
    paddingLeft: 14,
    position: "relative",
  },
  guidanceInlineList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  guidanceInlineItem: {
    background: "color-mix(in srgb, var(--color-primary) 7%, white 93%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 14,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.7,
    padding: "12px 14px",
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 96,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  toggleRow: {
    alignItems: "flex-start",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    padding: 14,
  },
  toggleTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  toggleText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 4,
  },
  helper: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.7,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  saveButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 16px",
  },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    padding: "12px 14px",
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    color: "#166534",
    padding: "12px 14px",
  },
  emptyState: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 20,
    color: "#475569",
    padding: 20,
  },
};
