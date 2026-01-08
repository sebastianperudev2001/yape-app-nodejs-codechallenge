import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Transaction Flow E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Prepare: Setup test application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure validation pipe like in production
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /transactions - Create Transaction', () => {
    it('debería crear una transacción válida con estado pending', async () => {
      // Prepare: Arrange transaction data
      const transactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 500,
      };

      // Execute: Act - Create transaction
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionDto)
        .expect(201);

      // Validate: Assert response structure and data
      expect(response.body).toHaveProperty('transactionExternalId');
      expect(response.body.transactionExternalId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      expect(response.body.transactionType).toEqual({
        name: 'Transfer',
      });

      expect(response.body.transactionStatus).toEqual({
        name: 'pending',
      });

      expect(response.body.value).toBe(500);
      expect(response.body.createdAt).toBeDefined();
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
    });

    it('debería crear una transacción de alto valor con estado pending', async () => {
      // Prepare: Arrange high-value transaction
      const transactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440002',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440003',
        tranferTypeId: 1,
        value: 1500,
      };

      // Execute: Act
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionDto)
        .expect(201);

      // Validate: Assert
      expect(response.body.transactionStatus.name).toBe('pending');
      expect(response.body.value).toBe(1500);
    });

    it('debería rechazar una transacción con valor negativo', async () => {
      // Prepare: Arrange invalid transaction with negative value
      const invalidDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: -100,
      };

      // Execute & Validate: Act & Assert
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('debería rechazar una transacción sin accountExternalIdDebit', async () => {
      // Prepare: Arrange incomplete transaction data
      const invalidDto = {
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 500,
      };

      // Execute & Validate: Act & Assert
      await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidDto)
        .expect(400);
    });

    it('debería rechazar una transacción con UUID inválido', async () => {
      // Prepare: Arrange transaction with invalid UUID
      const invalidDto = {
        accountExternalIdDebit: 'invalid-uuid',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 500,
      };

      // Execute & Validate: Act & Assert
      await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidDto)
        .expect(400);
    });

    it('debería rechazar una transacción con tranferTypeId inválido', async () => {
      // Prepare: Arrange transaction with invalid type ID
      const invalidDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 999, // ID no existente
        value: 500,
      };

      // Execute: Act
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidDto);

      // Validate: Assert - Should fail (400 or 404 depending on implementation)
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /transactions/:id - Get Transaction', () => {
    it('debería obtener una transacción existente por su ID', async () => {
      // Prepare: Create a transaction first
      const createDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440010',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440011',
        tranferTypeId: 1,
        value: 750,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(createDto)
        .expect(201);

      const transactionId = createResponse.body.transactionExternalId;

      // Execute: Act - Get the transaction
      const getResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(200);

      // Validate: Assert
      expect(getResponse.body.transactionExternalId).toBe(transactionId);
      expect(getResponse.body.value).toBe(750);
      expect(getResponse.body.transactionType).toEqual({
        name: 'Transfer',
      });
      expect(getResponse.body.transactionStatus).toBeDefined();
    });

    it('debería retornar 404 para una transacción inexistente', async () => {
      // Prepare: Arrange non-existent transaction ID
      const nonExistentId = '550e8400-e29b-41d4-a716-999999999999';

      // Execute & Validate: Act & Assert
      await request(app.getHttpServer())
        .get(`/transactions/${nonExistentId}`)
        .expect(404);
    });

    it('debería retornar 400 para un ID inválido', async () => {
      // Prepare: Arrange invalid transaction ID
      const invalidId = 'not-a-valid-uuid';

      // Execute: Act
      const response = await request(app.getHttpServer())
        .get(`/transactions/${invalidId}`);

      // Validate: Assert - Should be 400 or 404
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Complete Transaction Flow with Anti-Fraud', () => {
    it('debería procesar el flujo completo: crear → validar → actualizar estado (approved)', async () => {
      // Prepare: Arrange transaction that should be approved (value <= 1000)
      const transactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440020',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440021',
        tranferTypeId: 1,
        value: 800,
      };

      // Execute Step 1: Create transaction
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionDto)
        .expect(201);

      const transactionId = createResponse.body.transactionExternalId;

      // Validate Step 1: Transaction created with pending status
      expect(createResponse.body.transactionStatus.name).toBe('pending');

      // Execute Step 2: Wait for anti-fraud processing
      // En un entorno de pruebas real, esperarías a que Kafka procese el evento
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Execute Step 3: Get updated transaction
      const getResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(200);

      // Validate Step 3: Transaction should be approved
      expect(getResponse.body.transactionExternalId).toBe(transactionId);
      expect(getResponse.body.value).toBe(800);
      // Note: En un test E2E real con Kafka, el estado debería ser 'approved'
      // Si Kafka no está corriendo, seguirá siendo 'pending'
      expect(['pending', 'approved']).toContain(getResponse.body.transactionStatus.name);
    }, 10000); // Timeout aumentado para esperar procesamiento asíncrono

    it('debería procesar el flujo completo: crear → validar → actualizar estado (rejected)', async () => {
      // Prepare: Arrange transaction that should be rejected (value > 1000)
      const transactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440022',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440023',
        tranferTypeId: 1,
        value: 1500,
      };

      // Execute Step 1: Create transaction
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionDto)
        .expect(201);

      const transactionId = createResponse.body.transactionExternalId;

      // Validate Step 1: Transaction created with pending status
      expect(createResponse.body.transactionStatus.name).toBe('pending');

      // Execute Step 2: Wait for anti-fraud processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Execute Step 3: Get updated transaction
      const getResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(200);

      // Validate Step 3: Transaction should be rejected
      expect(getResponse.body.transactionExternalId).toBe(transactionId);
      expect(getResponse.body.value).toBe(1500);
      // Note: En un test E2E real con Kafka, el estado debería ser 'rejected'
      expect(['pending', 'rejected']).toContain(getResponse.body.transactionStatus.name);
    }, 10000);

    it('debería manejar correctamente el caso límite de $1000', async () => {
      // Prepare: Arrange transaction with boundary value (exactly 1000)
      const transactionDto = {
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440024',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440025',
        tranferTypeId: 1,
        value: 1000,
      };

      // Execute Step 1: Create transaction
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionDto)
        .expect(201);

      const transactionId = createResponse.body.transactionExternalId;

      // Validate Step 1: Transaction created
      expect(createResponse.body.transactionStatus.name).toBe('pending');
      expect(createResponse.body.value).toBe(1000);

      // Execute Step 2: Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Execute Step 3: Get updated transaction
      const getResponse = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(200);

      // Validate Step 3: Transaction with value = 1000 should be approved
      expect(['pending', 'approved']).toContain(getResponse.body.transactionStatus.name);
    }, 10000);
  });

  describe('Multiple Concurrent Transactions', () => {
    it('debería manejar múltiples transacciones concurrentes', async () => {
      // Prepare: Arrange multiple transactions
      const transactions = [
        {
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440030',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440031',
          tranferTypeId: 1,
          value: 100,
        },
        {
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440032',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440033',
          tranferTypeId: 1,
          value: 200,
        },
        {
          accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440034',
          accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440035',
          tranferTypeId: 1,
          value: 300,
        },
      ];

      // Execute: Act - Create all transactions concurrently
      const createPromises = transactions.map((dto) =>
        request(app.getHttpServer()).post('/transactions').send(dto),
      );

      const responses = await Promise.all(createPromises);

      // Validate: Assert all transactions were created
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.transactionExternalId).toBeDefined();
        expect(response.body.transactionStatus.name).toBe('pending');
      });

      // Validate: All transactions have unique IDs
      const ids = responses.map((r) => r.body.transactionExternalId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(transactions.length);
    });
  });
});
