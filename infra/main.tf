terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  az_suffix = "a"
  vpc_cidr  = var.vpc_cidr

  public_subnet_cidr  = cidrsubnet(local.vpc_cidr, 8, 0)
  private_subnet_cidr = cidrsubnet(local.vpc_cidr, 8, 1)

  name_prefix = var.name_prefix
}

# Networking
resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidr
  availability_zone       = "${var.aws_region}${local.az_suffix}"
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidr
  availability_zone = "${var.aws_region}${local.az_suffix}"

  tags = {
    Name = "${local.name_prefix}-private"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "${local.name_prefix}-nat"
  }

  depends_on = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# Security Group
resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "Allow SSH/HTTP/HTTPS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-ec2-sg"
  }
}

# Key Pair (generated locally, not committed)
resource "tls_private_key" "ec2_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2_key" {
  key_name   = "${local.name_prefix}-key"
  public_key = tls_private_key.ec2_key.public_key_openssh
}

resource "local_sensitive_file" "private_key_pem" {
  content              = tls_private_key.ec2_key.private_key_pem
  filename             = pathexpand("${path.module}/keys/lab-key.pem")
  file_permission      = "0600"
  directory_permission = "0700"
}

# EC2 Instance
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = aws_key_pair.ec2_key.key_name

  tags = {
    Name = "${local.name_prefix}-ec2"
  }

  depends_on = [aws_route_table_association.public]
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "public_subnet_id" {
  value       = aws_subnet.public.id
  description = "Public subnet ID"
}

output "private_subnet_id" {
  value       = aws_subnet.private.id
  description = "Private subnet ID"
}

output "nat_gateway_id" {
  value       = aws_nat_gateway.nat.id
  description = "NAT gateway ID"
}

output "ec2_public_ip" {
  value       = aws_instance.app.public_ip
  description = "EC2 public IP"
}

output "ssh_private_key_path" {
  value       = local_sensitive_file.private_key_pem.filename
  description = "Path to the generated private key"
  sensitive   = true
}

