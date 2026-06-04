export class CreateContractDto {
  eventFK: number;
  organizerFK: number;
  providerFK: number;
  serviceFK: number;
  finalPrice: number;
  status?: string;
  notes?: string;
  requiresFormalContract?: boolean;
  contractTerms?: string;
  organizerSigned?: boolean;
  providerSigned?: boolean;
  signedAt?: string | Date;
  contractPdfUrl?: string;
  paymentState?: string;
}
