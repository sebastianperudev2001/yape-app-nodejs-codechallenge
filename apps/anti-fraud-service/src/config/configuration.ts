export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  kafka: {
    brokers: process.env.KAFKA_BROKERS || 'localhost:9092',
    clientId: 'anti-fraud-service',
    groupId: 'anti-fraud-consumer',
  },
});
