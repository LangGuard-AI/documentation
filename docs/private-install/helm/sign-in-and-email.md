---
sidebar_position: 4
title: Sign-in and Email
description: Configure the admin password sign-in and the outbound email of a LangGuard Helm install
---

# Sign-in and Email

This page tells you how to configure the password sign-in of the admin account and how
LangGuard sends email. You set both in the Helm values file, then run the install command
again:

```bash
helm upgrade --install langguard ./charts/langguard -n langguard \
  -f values.yaml --timeout 15m
```

## Password sign-in

| Value | Default | Description |
|---|---|---|
| `auth.method` | `userpass` | `userpass`: the admin signs in with a password. `magiclink`: sign-in links by email only (needs [email](#email)). |
| `auth.adminEmail` | | Email address of the admin account. Necessary with `userpass`. |
| `auth.adminPassword` | generated | Empty: the chart generates a 24-character password on the first install and keeps it on each upgrade. `helm uninstall` deletes it: a new install generates a new password. |
| `auth.existingSecret` | | A Secret that you manage, with the password in the key `AUTH_PASSWORD`. Then `auth.adminPassword` is not used. |

Get the generated password:

```bash
kubectl get secret userpass-credentials -n langguard \
  -o jsonpath='{.data.AUTH_PASSWORD}' | base64 -d; echo
```

Password sign-in is for **one account only**: the admin account. On the first sign-in,
LangGuard creates the account and makes it an administrator.

- Other users do not have a password. An administrator adds them in
  [User Management](/settings/user-management), and LangGuard sends them an invitation
  email. They sign in with a link that LangGuard sends by email. For this, configure
  [Email](#email).
- When you turn on [single sign-on](/settings/sso), the password sign-in is not
  available.

### Change the admin password

Set the new password in the Secret of `auth.existingSecret`, or in `auth.adminPassword`
and run the install command. Then restart the dashboard:

```bash
kubectl rollout restart deployment/langguard-dashboard -n langguard
```

To get a new generated password, delete the Secret `userpass-credentials`, run the install
command, and restart the dashboard. Running pods keep the old password until they
restart.

## Email

LangGuard sends email for:

- User invitations
- Sign-in links
- Rate limit notifications

:::warning Configure email before you add users
By default, the chart configures no email (`email.provider: none`). Then LangGuard sends
no invitations and no sign-in links. Only the admin password sign-in and single sign-on
work.
:::

| Value | Description |
|---|---|
| `email.provider` | `none` (default), `smtp` or `ses`. |
| `email.from` | Sender address, for example `"LangGuard <langguard@mycompany.com>"`. Use an address in a domain that your mail service can send for. |
| `email.smtp.host` | SMTP relay. Necessary with `smtp`. |
| `email.smtp.port` | Port of the relay. The default is 587. Port 465 is not supported. |
| `email.ses.region` | AWS region of SES. Necessary with `ses`. |
| `email.ses.existingSecret` | A Secret with the keys `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. |

When the email values change, the dashboard pods restart on the next upgrade.

### Option A: SMTP relay

LangGuard connects to the relay and upgrades the connection with STARTTLS when the relay
offers it. It does not send a username or password. The relay must accept mail from the
outbound IP address of the cluster, or the relay is in a network that the cluster can
reach.

```yaml
email:
  provider: smtp
  from: "LangGuard <langguard@mycompany.com>"
  smtp:
    host: smtp-relay.mycompany.com
```

:::note
The SMTP relay option does not support a relay that requires a username and password, for
example Microsoft 365 or SendGrid. Use Amazon SES, or a relay that accepts mail by IP
address.
:::

### Option B: Amazon SES

Create an IAM user in AWS with permission to send email through SES (`ses:SendEmail`), and
create an access key for it. Verify the domain of the sender address in SES, in the region
of `email.ses.region`. Put the access key in a Secret:

```bash
kubectl create secret generic langguard-ses -n langguard \
  --from-literal=AWS_ACCESS_KEY_ID='AKIA...' \
  --from-literal=AWS_SECRET_ACCESS_KEY='...'
```

```yaml
email:
  provider: ses
  from: "LangGuard <langguard@mycompany.com>"
  ses:
    region: us-east-1
    existingSecret: langguard-ses
```

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
