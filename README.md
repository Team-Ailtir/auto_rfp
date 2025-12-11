# AutoRFP - AI-Powered RFP Response Platform

AutoRFP is an intelligent platform that automates RFP (Request for Proposal) response generation using advanced AI. Built with Next.js 15 and powered by LlamaIndex, it helps organizations respond to RFPs 80% faster by automatically extracting questions from documents and generating contextual responses based on your knowledge base.

## ✨ Features

### 🤖 AI-Powered Document Processing
- **Automatic Question Extraction**: Upload RFP documents and automatically extract structured questions
- **Intelligent Response Generation**: Generate contextual responses using your organization's documents
- **Multi-Step AI Analysis**: Advanced reasoning process that analyzes, searches, extracts, and synthesizes responses
- **Document Understanding**: Supports Word, PDF, Excel, and PowerPoint files

### 🏢 Organization Management
- **Multi-Tenant Architecture**: Support for multiple organizations with role-based access
- **Team Collaboration**: Invite team members with different permission levels (owner, admin, member)
- **Project Organization**: Organize RFPs into projects for better management
- **Auto-Connect LlamaCloud**: Automatically connects to LlamaCloud when single project is available

### 🔍 Advanced Search & Indexing
- **Multi-Provider Support**: Connect to LlamaCloud or Amazon Bedrock Knowledge Bases
- **Flexible Provider Selection**: Choose your document indexing provider via environment variable
- **Multiple Index Support**: Work with multiple document indexes per project
- **Source Attribution**: Track and cite sources in generated responses
- **Real-time Search**: Search through your document knowledge base

### 💬 Interactive AI Responses
- **Chat Interface**: Interactive chat-style interface for generating responses
- **Multi-Step Response Dialog**: Detailed step-by-step response generation process
- **Source Details**: View detailed source information and relevance scores
- **Response Editing**: Edit and refine AI-generated responses

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Authentication**: Supabase Auth (Magic Link)
- **Database**: PostgreSQL with Prisma ORM
- **AI & ML**: OpenAI GPT-4o, LlamaIndex
- **Document Indexing**: LlamaCloud or Amazon Bedrock Knowledge Bases
- **Deployment**: Vercel (recommended)
- **Package Manager**: pnpm

## 📋 Prerequisites

Before setting up AutoRFP, ensure you have:

- **Node.js** 18.x or later
- **pnpm** 8.x or later
- **PostgreSQL** database (local or cloud)
- **Supabase** account and project
- **OpenAI** API account with credits
- **Document Index Provider** (choose one):
  - **LlamaCloud** account (recommended for quick setup)
  - **Amazon Bedrock** with Knowledge Bases (for AWS-native deployments)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/auto_rfp.git
cd auto_rfp
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/auto_rfp"
DIRECT_URL="postgresql://username:password@localhost:5432/auto_rfp"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"

# Document Index Provider Selection
LLAMA_SDK_PROVIDER="llamacloud"  # Options: "llamacloud" or "bedrock"

# LlamaCloud (if using llamacloud provider)
LLAMACLOUD_API_KEY="your-llamacloud-api-key"
# Optional: Internal API key and domain for internal users
# LLAMACLOUD_API_KEY_INTERNAL="your-internal-llamacloud-api-key"
# INTERNAL_EMAIL_DOMAIN="@yourdomain.com"  # Defaults to @runllama.ai

# Amazon Bedrock (if using bedrock provider)
# AWS_ACCESS_KEY_ID="your-aws-access-key"
# AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
# AWS_REGION="us-east-1"  # Your AWS region

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

#### Set up PostgreSQL Database

If using local PostgreSQL:
```bash
# Create database
createdb auto_rfp

# Or using psql
psql -c "CREATE DATABASE auto_rfp;"
```

#### Run Database Migrations

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# (Optional) Seed with sample data
pnpm prisma db seed
```

### 5. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Configure authentication providers in **Authentication > Providers**
4. Set up email templates in **Authentication > Email Templates**

### 6. OpenAI Setup

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key in **API Keys** section
3. Add credits to your account
4. Copy the API key to `OPENAI_API_KEY`

### 7. Document Index Provider Setup

AutoRFP supports two document indexing providers. Choose one based on your needs:

#### Option A: LlamaCloud (Recommended for Quick Setup)

1. Create an account at [cloud.llamaindex.ai](https://cloud.llamaindex.ai)
2. Create a new project
3. Generate an API key
4. Configure your environment:
   ```bash
   LLAMA_SDK_PROVIDER="llamacloud"
   LLAMACLOUD_API_KEY="your-llamacloud-api-key"
   ```

#### Option B: Amazon Bedrock Knowledge Bases

1. Set up an AWS account with Bedrock access
2. Create a Knowledge Base in Amazon Bedrock:
   - Go to Amazon Bedrock console
   - Navigate to Knowledge Bases
   - Create a new Knowledge Base with your documents
   - Note the Knowledge Base ID and region
3. Create IAM credentials with Bedrock permissions
4. Configure your environment:
   ```bash
   LLAMA_SDK_PROVIDER="bedrock"
   AWS_ACCESS_KEY_ID="your-access-key-id"
   AWS_SECRET_ACCESS_KEY="your-secret-access-key"
   AWS_REGION="us-east-1"  # Your AWS region
   ```

#### Switching Providers

You can switch between providers by updating the `LLAMA_SDK_PROVIDER` environment variable:
- Set to `"llamacloud"` to use LlamaCloud
- Set to `"bedrock"` to use Amazon Bedrock

Organizations must disconnect from their current provider before connecting to a different one.

### 8. Run the Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
auto_rfp/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API routes
│   │   ├── extract-questions/    # Question extraction endpoint
│   │   ├── generate-response/    # Response generation endpoint
│   │   ├── llamacloud/          # LlamaCloud integration APIs
│   │   ├── organizations/       # Organization management APIs
│   │   └── projects/            # Project management APIs
│   ├── auth/                    # Authentication pages
│   ├── login/                   # Login flow
│   ├── organizations/           # Organization management pages
│   ├── projects/                # Project management pages
│   └── upload/                  # Document upload page
├── components/                  # Reusable React components
│   ├── organizations/           # Organization-specific components
│   ├── projects/               # Project-specific components
│   ├── ui/                     # UI component library (shadcn/ui)
│   └── upload/                 # Upload-related components
├── lib/                        # Core libraries and utilities
│   ├── services/               # Business logic services
│   ├── interfaces/             # TypeScript interfaces
│   ├── validators/             # Zod validation schemas
│   ├── utils/                  # Utility functions
│   └── errors/                 # Error handling
├── prisma/                     # Database schema and migrations
├── types/                      # TypeScript type definitions
└── providers/                  # React context providers
```

## 🔧 Key Configuration

### Database Schema

The application uses a multi-tenant architecture with the following key models:

- **User**: Authenticated users
- **Organization**: Tenant organizations
- **OrganizationUser**: User-organization relationships with roles
- **Project**: RFP projects within organizations
- **Question**: Extracted RFP questions
- **Answer**: AI-generated responses with sources
- **ProjectIndex**: LlamaCloud document indexes

### Authentication Flow

1. **Magic Link Authentication**: Users sign in via email magic links
2. **Organization Creation**: New users can create organizations
3. **Team Invitations**: Organization owners can invite team members
4. **Role-based Access**: Support for owner, admin, and member roles

### AI Processing Pipeline

1. **Document Upload**: Users upload RFP documents
2. **Question Extraction**: OpenAI extracts structured questions
3. **Document Indexing**: LlamaCloud indexes documents for search
4. **Response Generation**: Multi-step AI process generates responses
5. **Source Attribution**: Responses include relevant source citations

## 🚀 Deployment

### Environment Variables for Production

```bash
# Set these in your deployment platform
DATABASE_URL="your-production-database-url"
DIRECT_URL="your-production-database-direct-url"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
OPENAI_API_KEY="your-openai-api-key"
LLAMACLOUD_API_KEY="your-llamacloud-api-key"
# LLAMACLOUD_API_KEY_INTERNAL="your-internal-llamacloud-api-key"  # Optional: for internal users
# INTERNAL_EMAIL_DOMAIN="@yourdomain.com"  # Optional: defaults to @runllama.ai
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Deploy to Other Platforms

The application can be deployed to any platform that supports Node.js:
- Railway
- Heroku
- Digital Ocean App Platform
- AWS Amplify
- Google Cloud Run

## 🔌 API Endpoints

### Core APIs

- `POST /api/organizations` - Create organization
- `GET /api/organizations/{id}` - Get organization details
- `POST /api/projects` - Create project
- `POST /api/extract-questions` - Extract questions from documents
- `POST /api/generate-response` - Generate AI responses
- `POST /api/generate-response-multistep` - Multi-step response generation

### LlamaCloud Integration

- `GET /api/llamacloud/projects` - Get available LlamaCloud projects
- `POST /api/llamacloud/connect` - Connect organization to LlamaCloud
- `POST /api/llamacloud/disconnect` - Disconnect from LlamaCloud
- `GET /api/llamacloud/documents` - Get organization documents

## 🧪 Sample Data

Try the platform with our sample RFP document:
- **Sample File**: [RFP - Launch Services for Medium-Lift Payloads](https://qluspotebpidccpfbdho.supabase.co/storage/v1/object/public/sample-files//RFP%20-%20Launch%20Services%20for%20Medium-Lift%20Payloads.pdf)
- **Use Case**: Download and upload to test question extraction and response generation

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database connection
pnpm prisma db pull

# Reset database (WARNING: destroys data)
pnpm prisma migrate reset
```

**Authentication Issues**
- Verify Supabase URL and keys
- Check email template configuration
- Ensure redirect URLs are configured correctly

**AI Processing Issues**
- Verify OpenAI API key and credits
- Check LlamaCloud API key if using document indexing
- Review API rate limits

**Environment Variables**
```bash
# Check if all required variables are set
node -e "console.log(process.env)" | grep -E "(DATABASE_URL|SUPABASE|OPENAI|LLAMACLOUD)"
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Run the linter: `pnpm lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards

- **TypeScript**: All code must be typed
- **ESLint**: Follow the configured linting rules
- **Prettier**: Code is automatically formatted
- **Component Structure**: Follow the established patterns

### Testing

```bash
# Run tests (when available)
pnpm test

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LlamaIndex** for powerful document indexing and retrieval
- **OpenAI** for advanced language model capabilities
- **Supabase** for authentication and database infrastructure
- **Vercel** for Next.js framework and deployment platform
- **Radix UI** for accessible component primitives

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Community**: Join our discussions for help and feature requests

---

Built with ❤️ using Next.js, LlamaIndex, and OpenAI
