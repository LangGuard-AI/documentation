---
sidebar_position: 3
title: Sign-in and Email
description: Configure the admin password sign-in and the outbound email of a LangGuard install on Azure
---

# Sign-in and Email

This page tells you how to configure the password sign-in of the admin account and how
LangGuard sends email in an Azure install.

## Password sign-in

The installer configures password sign-in. You do not set the password. The installer
generates it on each run.

| Flag | Default | Description |
|---|---|---|
| `--auth` | `userpass` | Sign-in method. `userpass` is the only supported value. |
| `--admin-email` | `admin@<domain>` | Email address of the admin account. |

```bash
./install.sh \
  --subscription 00000000-0000-0000-0000-000000000000 \
  --location     eastus2 \
  --domain       langguard.mycompany.com \
  --admin-cidr   203.0.113.10/32 \
  --acme-email   platform@mycompany.com \
  --admin-email  platform-admin@mycompany.com
```

The installer prints the admin email and the password two times: before the last
Terraform step and at the end. Record them. The installer does not write the password to a
file. Terraform keeps it in the Kubernetes secret `userpass-credentials` and in the
Terraform state.

Password sign-in is for **one account only**: the admin account. On the first sign-in,
LangGuard creates the account and makes it an administrator.

- Use `--admin-email` to change the admin account.
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

Running pods keep the old password until they restart.

## Email

LangGuard sends email for:

- User invitations
- Sign-in links
- Rate limit notifications

:::warning Configure email before you add users
By default, the installer configures no email (`--email-provider none`). Then LangGuard
sends no invitations and no sign-in links. Only the admin password sign-in and single
sign-on work.
:::

| Flag | Description |
|---|---|
| `--email-provider` | `none` (default), `smtp` or `ses`. |
| `--email-from` | Sender address, for example `"LangGuard <langguard@mycompany.com>"`. Necessary with `smtp` and `ses`. Use an address in a domain that your mail service can send for. |
| `--smtp-host` | SMTP relay. Necessary with `smtp`. |
| `--smtp-port` | Port of the relay, `smtp` only. The default is 587. Port 465 is not supported. |
| `--ses-region` | AWS region of SES. Necessary with `ses`. |

When the email settings change, the dashboard pods restart automatically on the next run
of the installer.

### Option A: SMTP relay

LangGuard connects to the relay and upgrades the connection with STARTTLS when the relay
offers it. It does not send a username or password. The relay must accept mail from the
IP address of the cluster.

The nodes send traffic to the internet from one static IP address of the NAT gateway. Get
it from the Terraform output:

```bash
cd langguard-install/azure/terraform
terraform output -raw nat_outbound_ip_address
```

Add this address to the allowed IP addresses of the relay. A relay in a network that you
connect to the virtual network also works.

```bash
./install.sh <your flags> \
  --email-provider smtp \
  --smtp-host      smtp-relay.mycompany.com \
  --email-from     "LangGuard <langguard@mycompany.com>"
```

:::note
The SMTP relay option does not support a relay that requires a username and password,
for example Microsoft 365 or SendGrid. Use Amazon SES, or a relay that accepts mail by IP
address.
:::

### Option B: Amazon SES

Create an IAM user in AWS with permission to send email through SES (`ses:SendEmail`),
and create an access key for it. Verify the domain of the sender address in SES, in the
region that you give with `--ses-region`.

Do not put the access key in a file. Export it before you run the installer:

```bash
export TF_VAR_aws_ses_access_key_id="AKIA..."
export TF_VAR_aws_ses_secret_access_key="..."

./install.sh <your flags> \
  --email-provider ses \
  --ses-region     us-east-1 \
  --email-from     "LangGuard <langguard@mycompany.com>"
```

Export the key again before each run of the installer. The installer stops if
`--email-provider ses` is given without the key.

Terraform writes the key to the Kubernetes secret `ses-credentials` and to the Terraform
state. Restrict access to the state storage account.

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
| `No email provider configured` | No provider is set. LangGuard does not send the email. |
