# Supabase Storage Backup Scheduler

This project is a Node.js application written in TypeScript that automates the backup of files from a Supabase storage bucket to an AWS S3 bucket. It utilizes cron jobs to schedule backups and sends notifications to Slack upon completion or failure.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Cron Schedule](#cron-schedule)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Automated Backups**: Schedule regular backups of files from Supabase storage to AWS S3.
- **Slack Notifications**: Receive notifications on backup success or failure.
- **Recursive File Listing**: Supports downloading files from nested folders in Supabase storage.
- **Environment Configuration**: Uses environment variables for configuration, ensuring sensitive data is not hard-coded.

## Technologies Used

- **Node.js**: JavaScript runtime for building the application.
- **TypeScript**: Superset of JavaScript that adds static types.
- **Supabase**: Backend as a service for managing storage and database.
- **AWS SDK**: For interacting with AWS S3.
- **Node-Cron**: For scheduling tasks.
- **dotenv**: For loading environment variables from a `.env` file.
- **node-fetch**: For making HTTP requests to fetch files.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node package manager)
- AWS account with S3 access
- Supabase account with storage setup
- Slack account for notifications

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/supabase-storage-backup-scheduler.git
   cd supabase-storage-backup-scheduler
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:

   ```plaintext
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_BUCKET_NAME=your_supabase_bucket_name
   AWS_REGION=your_aws_region
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_S3_BUCKET_NAME=your_aws_s3_bucket_name
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   CRON_BACKUP=your_cron_schedule_expression
   ```

   Replace the placeholders with your actual credentials and desired cron schedule.

## Usage

To start the backup scheduler, run the following command:

```bash
npm start
```

The application will run according to the specified cron schedule, downloading files from Supabase and uploading them to S3.

## Cron Schedule

The cron schedule is defined in the `.env` file under the `CRON_BACKUP` variable. The format follows the standard cron syntax:

```
* * * * *  // Every minute
0 * * * *  // Every hour
0 0 * * *  // Every day at midnight
```

Refer to [crontab.guru](https://crontab.guru/) for more examples and explanations of cron expressions.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
