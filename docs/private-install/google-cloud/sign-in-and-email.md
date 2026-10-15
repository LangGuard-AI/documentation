---
sidebar_position: 5
title: Sign-in and Email
description: Configure the admin password sign-in and the outbound email of a LangGuard install on Google Cloud
---

# Sign-in and Email

This page tells you how to configure the password sign-in of the admin account and how
LangGuard sends email in a Google Cloud install.

## Password sign-in

The installer configures password sign-in. You do not set the password. The installer
generates it on each run.

| Flag | Default | Description |
|---|---|---|
| `--auth` | `userpass` | Sign-in method. `userpass` is the only supported value. |
| `--admin-email` | `admin@<domain>` | Email address of the admin account. |

```bash
./install.sh \
  --project     my-gcp-project \
  --domain      app.mycompany.com \
  --admin-cidr  203.0.113.10/32 \
  --admin-email platform-admin@mycompany.com
```

The installer prints the admin email and the password two times: before the Terraform
apply and at the end. Record them. The installer does not write the password to a file.
See [Secrets](/private-install/google-cloud/installation#secrets).

### How it works

Terraform writes the sign-in settings to the Kubernetes secret `userpass-credentials` in
the `langguard` namespace. The `langguard-dashboard` pods read them as environment
variables:

| Variable | Value |
|---|---|
| `AUTH_METHOD` | `userpass` |
| `AUTH_USERNAME` | The `--admin-email` value |
| `AUTH_PASSWORD` | The generated password |
| `ALLOWED_AUTH_DOMAIN` | The domain of the `--admin-email` value |

Password sign-in is for **one account only**: the admin account. On the first sign-in,
LangGuard creates the account and makes it an administrator.

- Use `--admin-email` to change the admin account. Do not set `auth_username`,
  `auth_password` or `auth_method` in your `--tfvars` file.
- Other users do not have a password. An administrator adds them in
  [User Management](/settings/user-management), and LangGuard sends them an invitation
  email. They sign in with a link that LangGuard sends by email. For this, configure
  [Email](#email).
- When you turn on [single sign-on](/settings/sso), the password sign-in is not
  available.

### Change the admin password

Each run of `install.sh` generates a new password and writes it to the
`userpass-credentials` secret. To get a new password, run the installer again with the
same flags, then restart the dashboard:

```bash
kubectl rollout restart deployment/langguard-dashboard -n langguard
```

Running pods keep the old password until they restart. See
[Run the installer again](/private-install/google-cloud/installation#run-the-installer-again).

## Email

LangGuard sends email for:

- User invitations
- Sign-in links
- Rate limit notifications

:::warning Configure email before you add users
The installer does not set email variables. The Terraform default is Amazon SES without
credentials, and in that configuration LangGuard cannot send email. Invitations and
sign-in links fail. Configure one of the options below in your `--tfvars` file.
:::

You configure email with Terraform variables in your own variables file. See
[Your own Terraform variables](/private-install/google-cloud/installation#your-own-terraform-variables).

| Variable | Default | Description |
|---|---|---|
| `email_provider` | `"ses"` | `"ses"` for Amazon SES. `""` for an SMTP relay. |
| `email_from_address` | `LangGuard System <langguard-system@langguard.ai>` | Sender address. Use an address in a domain that your mail service can send for. |
| `smtp_host` | `"smtp-relay.gmail.com"` | SMTP relay host. Used when `email_provider` is `""`. |
| `aws_ses_region` | `"us-west-2"` | AWS region of SES. Used when `email_provider` is `"ses"`. |
| `aws_ses_access_key_id` | `""` | AWS access key ID for SES. Sensitive. |
| `aws_ses_secret_access_key` | `""` | AWS secret access key for SES. Sensitive. |

Always set `email_from_address`. The default address is in the `langguard.ai` domain.
Your mail service rejects it, or recipients mark it as spam.

### Option A: SMTP relay

LangGuard connects to the relay on port 587. It does not send a username or password. The
relay must accept mail from the IP address of the cluster. For example, use the
[Google Workspace SMTP relay](https://support.google.com/a/answer/2956491) with IP
address authentication, or a relay in your network.

```hcl
# langguard.tfvars
email_provider     = ""
smtp_host          = "smtp-relay.gmail.com"
email_from_address = "LangGuard <langguard@mycompany.com>"
```

In an install with new infrastructure, the nodes send traffic to the internet from one
static Cloud NAT IP address. Get it from the Terraform output:

```bash
cd langguard-install/gcp/terraform
terraform output -raw nat_outbound_ip_address
```

Add this address to the allowed IP addresses of the relay. With
`--use-existing-network`, the installer creates no Cloud NAT. Use the egress IP address
of your own network.

:::note
The SMTP relay option does not support a relay that requires a username and password,
for example Microsoft 365 or SendGrid. Use Amazon SES, or a relay that accepts mail by
IP address.
:::

### Option B: Amazon SES

Create an IAM user in AWS with permission to send email through SES (`ses:SendEmail`),
and create an access key for it. Verify the domain of `email_from_address` in SES, in the
region that you set in `aws_ses_region`.

```hcl
# langguard.tfvars
email_provider     = "ses"
aws_ses_region     = "us-east-1"
email_from_address = "LangGuard <langguard@mycompany.com>"
```

Do not put the access key in the file. Export it before you run the installer. Terraform
reads it from the environment:

```bash
export TF_VAR_aws_ses_access_key_id="AKIA..."
export TF_VAR_aws_ses_secret_access_key="..."

./install.sh \
  --project    my-gcp-project \
  --domain     app.mycompany.com \
  --admin-cidr 203.0.113.10/32 \
  --tfvars     ../langguard.tfvars
```

Export the key again before each run of the installer. If the variables are not set, the
next apply writes empty values to the secret, and LangGuard cannot send email.

Terraform writes the key to the Kubernetes secret `ses-credentials` and to the Terraform
state. Restrict access to the state bucket.

### Apply the change

Run `install.sh` again with your `--tfvars` file. Terraform updates the
`langguard-dashboard-config` ConfigMap and the secrets. Then restart the dashboard:

```bash
kubectl rollout restart deployment/langguard-dashboard -n langguard
```

The installer also generates a new admin password on this run. See
[Change the admin password](#change-the-admin-password).

### Service mesh

If the mesh allows only registered destinations, register the email endpoint for
`langguard-dashboard`:

- SMTP relay: the `smtp_host` value on TCP 587
- Amazon SES: `email.<aws_ses_region>.amazonaws.com` on TCP 443

See [Service Mesh](/private-install/google-cloud/service-mesh#egress).

### Verify

Invite a user in [User Management](/settings/user-management). Then read the dashboard
log:

```bash
kubectl logs deployment/langguard-dashboard -n langguard | grep EmailService
```

| Log line | Meaning |
|---|---|
| `Email service initialized with SMTP relay` or `with Amazon SES` | The provider that LangGuard uses. |
| `Email sent successfully to <address>` | The mail service accepted the message. |
| `Failed to send email` | The mail service rejected the message. The error follows. |
| `No email provider configured` | No provider is set. LangGuard writes the email to the log and does not send it. |
