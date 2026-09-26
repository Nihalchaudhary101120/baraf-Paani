import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from '../config/db.js';
import User from '../models/master-models/user.js';
import Personnel from '../models/master-models/personnel.js';
import Expedition from '../models/master-models/expedition.js';
import Station from '../models/master-models/station.js';
import MedicalAssessment from '../models/approval-models/medical-assessment.js';
import TrainingClearance from '../models/approval-models/training.js';

const seedData = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB for seeding...");

    // 1. Ensure Stations
    let maitri = await Station.findOne({ code: 'MAITRI' });
    if (!maitri) {
      maitri = await Station.create({ code: 'MAITRI', name: 'Maitri Station (East Antarctica)', location: 'Schirmacher Oasis', capacity: 65, isActive: true });
    }
    let bharati = await Station.findOne({ code: 'BHARATI' });
    if (!bharati) {
      bharati = await Station.create({ code: 'BHARATI', name: 'Bharati Station (Larsemann Hills)', location: 'Larsemann Hills', capacity: 47, isActive: true });
    }

    // 2. Ensure Expeditions
    let exp47 = await Expedition.findOne({ expeditionCode: 'EXP-47' });
    if (!exp47) {
      exp47 = await Expedition.create({
        expeditionCode: 'EXP-47',
        name: '47th Indian Antarctic Mission',
        year: 2026,
        season: 'WINTER',
        status: 'ACTIVE',
        stations: [{ stationId: maitri._id, deploymentType: 'PRIMARY' }, { stationId: bharati._id, deploymentType: 'SECONDARY' }]
      });
    }

    let exp46 = await Expedition.findOne({ expeditionCode: 'EXP-46' });
    if (!exp46) {
      exp46 = await Expedition.create({
        expeditionCode: 'EXP-46',
        name: '46th Indian Scientific Expedition',
        year: 2025,
        season: 'WINTER',
        status: 'COMPLETED',
        stations: [{ stationId: maitri._id, deploymentType: 'PRIMARY' }]
      });
    }

    let exp48 = await Expedition.findOne({ expeditionCode: 'EXP-48' });
    if (!exp48) {
      exp48 = await Expedition.create({
        expeditionCode: 'EXP-48',
        name: '48th Antarctic Expedition',
        year: 2027,
        season: 'SUMMER',
        status: 'PLANNING',
        stations: [{ stationId: bharati._id, deploymentType: 'PRIMARY' }]
      });
    }

    // 3. Medical Officer User
    let medOfficer = await User.findOne({ email: 'medical.officer@ncpor.res.in' });
    if (!medOfficer) {
      medOfficer = await User.create({
        name: 'Dr. Vikram Malhotra',
        email: 'medical.officer@ncpor.res.in',
        employeeId: 'NCP-MED-01',
        password: 'password123',
        role: 'MEDICAL_OFFICER',
        designation: 'Chief Antarctic Medical Officer',
        organization: 'NCPOR Goa',
        stationId: maitri._id
      });
    }

    // 4. Sample Roster Candidates
    const candidates = [
      {
        name: 'Rahul Sharma',
        employeeId: 'NCP-1042',
        email: 'rahul.s@ncpor.res.in',
        role: 'SCIENTIST',
        designation: 'Senior Glaciologist',
        organization: 'NCPOR',
        station: maitri,
        season: 'WINTER',
        passport: 'Z8829102',
        status: 'FIT',
        trainingStatus: 'COMPLETED',
        physical: { heightCm: 178, weightKg: 74, bloodPressure: '120/80', pulseRate: 72, oxygenSaturation: 99, chestMeasurementCm: 98, vision: { leftEye: '6/6', rightEye: '6/6' }, hearing: 'Normal bilaterally' },
        medicalHistory: { allergies: ['None'], chronicDiseases: ['None'], previousSurgeries: ['Appendectomy (2018)'], currentMedications: ['None'] },
        vaccinations: { tetanus: true, hepatitisA: true, hepatitisB: true, influenza: true, covid19: true, others: ['Yellow Fever'] },
        lab: { bloodGroup: 'O+', hemoglobin: 15.2, bloodSugar: 92, ecgStatus: 'Normal Sinus Rhythm', xrayStatus: 'Clear lungs' },
        psych: { stressTolerance: 'High', isolationFitness: 'Cleared for prolonged winter isolation', remarks: 'Exceptional endurance' },
        clearance: { status: 'FIT', restrictions: [], remarks: 'Cleared for full Antarctic winter duties.' }
      },
      {
        name: 'Dr. Priya Singh',
        employeeId: 'NCP-1055',
        email: 'priya.singh@ncpor.res.in',
        role: 'SCIENTIST',
        designation: 'Atmospheric Physicist',
        organization: 'IIG Mumbai',
        station: bharati,
        season: 'SUMMER',
        passport: 'P4491029',
        status: 'FIT_WITH_RESTRICTIONS',
        trainingStatus: 'COMPLETED',
        physical: { heightCm: 165, weightKg: 60, bloodPressure: '128/84', pulseRate: 78, oxygenSaturation: 98, chestMeasurementCm: 86, vision: { leftEye: '6/9', rightEye: '6/6' }, hearing: 'Normal' },
        medicalHistory: { allergies: ['Penicillin'], chronicDiseases: ['Mild Exercise-Induced Asthma'], previousSurgeries: ['None'], currentMedications: ['Salbutamol Inhaler (PRN)'] },
        vaccinations: { tetanus: true, hepatitisA: true, hepatitisB: true, influenza: true, covid19: true, others: [] },
        lab: { bloodGroup: 'B+', hemoglobin: 13.8, bloodSugar: 98, ecgStatus: 'Normal', xrayStatus: 'Clear' },
        psych: { stressTolerance: 'Moderate to High', isolationFitness: 'Cleared for summer complement', remarks: 'Good cognitive resilience' },
        clearance: { status: 'FIT_WITH_RESTRICTIONS', restrictions: ['No solo field traverses', 'Inhaler to be carried at all times'], remarks: 'Restricted from high-altitude glacier excursions.' }
      },
      {
        name: 'Aman Verma',
        employeeId: 'NCP-1088',
        email: 'aman.v@ncpor.res.in',
        role: 'STATION_OPERATOR',
        designation: 'HVAC & Genset Specialist',
        organization: 'NCPOR',
        station: maitri,
        season: 'WINTER',
        passport: 'M9918230',
        status: 'PENDING',
        trainingStatus: 'PARTIAL',
        physical: { heightCm: 175, weightKg: 82, bloodPressure: '130/85', pulseRate: 76, oxygenSaturation: 97, chestMeasurementCm: 96, vision: { leftEye: '6/6', rightEye: '6/6' }, hearing: 'Normal' },
        medicalHistory: { allergies: ['None'], chronicDiseases: ['None'], previousSurgeries: ['None'], currentMedications: ['None'] },
        vaccinations: { tetanus: true, hepatitisA: true, hepatitisB: false, influenza: true, covid19: true, others: [] },
        lab: { bloodGroup: 'A+', hemoglobin: 14.8, bloodSugar: 95, ecgStatus: 'Normal', xrayStatus: 'Clear' },
        psych: { stressTolerance: 'Moderate', isolationFitness: 'Pending final review', remarks: 'Awaiting baseline review' },
        clearance: { status: 'PENDING', restrictions: [], remarks: 'Pending baseline exam completion.' }
      },
      {
        name: 'Karan Mehta',
        employeeId: 'NCP-1102',
        email: 'karan.m@ncpor.res.in',
        role: 'LOGISTICS_OFFICER',
        designation: 'Cargo Specialist',
        organization: 'SCI',
        station: bharati,
        season: 'SUMMER',
        passport: 'K1182901',
        status: 'NOT_FIT',
        trainingStatus: 'PENDING',
        physical: { heightCm: 172, weightKg: 98, bloodPressure: '165/105', pulseRate: 94, oxygenSaturation: 94, chestMeasurementCm: 110, vision: { leftEye: '6/12', rightEye: '6/12' }, hearing: 'Normal' },
        medicalHistory: { allergies: ['None'], chronicDiseases: ['Uncontrolled Stage 2 Hypertension', 'Cardiac Arrhythmia'], previousSurgeries: ['None'], currentMedications: ['Amlodipine 10mg'] },
        vaccinations: { tetanus: true, hepatitisA: false, hepatitisB: false, influenza: true, covid19: true, others: [] },
        lab: { bloodGroup: 'A+', hemoglobin: 16.1, bloodSugar: 145, ecgStatus: 'Ventricular Premature Beats', xrayStatus: 'Cardiomegaly noted' },
        psych: { stressTolerance: 'Sub-optimal', isolationFitness: 'Not recommended', remarks: 'Medical risk profile exceeds safe threshold.' },
        clearance: { status: 'NOT_FIT', restrictions: [], remarks: 'Severe cardiac risk and uncontrolled hypertension.' }
      },
      {
        name: 'Sunita Deshmukh',
        employeeId: 'NCP-1115',
        email: 'sunita.d@ncpor.res.in',
        role: 'SCIENTIST',
        designation: 'Geomorphologist',
        organization: 'GSI Kolkata',
        station: maitri,
        season: 'WINTER',
        passport: 'S7712903',
        status: 'FIT',
        trainingStatus: 'COMPLETED',
        physical: { heightCm: 162, weightKg: 58, bloodPressure: '118/75', pulseRate: 68, oxygenSaturation: 99, chestMeasurementCm: 84, vision: { leftEye: '6/6', rightEye: '6/6' }, hearing: 'Normal' },
        medicalHistory: { allergies: ['None'], chronicDiseases: ['None'], previousSurgeries: ['None'], currentMedications: ['None'] },
        vaccinations: { tetanus: true, hepatitisA: true, hepatitisB: true, influenza: true, covid19: true, others: [] },
        lab: { bloodGroup: 'AB+', hemoglobin: 14.1, bloodSugar: 88, ecgStatus: 'Normal Sinus Rhythm', xrayStatus: 'Clear' },
        psych: { stressTolerance: 'High', isolationFitness: 'Cleared', remarks: 'Previous winter experience' },
        clearance: { status: 'FIT', restrictions: [], remarks: 'Cleared for full deployment.' }
      },
      {
        name: 'Rajesh Nair',
        employeeId: 'NCP-1120',
        email: 'rajesh.n@ncpor.res.in',
        role: 'STATION_COMMANDER',
        designation: 'Station Leader',
        organization: 'NCPOR',
        station: maitri,
        season: 'WINTER',
        passport: 'N8829012',
        status: 'FIT',
        trainingStatus: 'COMPLETED',
        physical: { heightCm: 180, weightKg: 85, bloodPressure: '122/82', pulseRate: 70, oxygenSaturation: 99, chestMeasurementCm: 102, vision: { leftEye: '6/6', rightEye: '6/6' }, hearing: 'Normal' },
        medicalHistory: { allergies: ['None'], chronicDiseases: ['None'], previousSurgeries: ['None'], currentMedications: ['None'] },
        vaccinations: { tetanus: true, hepatitisA: true, hepatitisB: true, influenza: true, covid19: true, others: [] },
        lab: { bloodGroup: 'O+', hemoglobin: 15.5, bloodSugar: 90, ecgStatus: 'Normal', xrayStatus: 'Clear' },
        psych: { stressTolerance: 'Exceptional', isolationFitness: 'Station Leader clearance', remarks: 'High leadership resilience' },
        clearance: { status: 'FIT', restrictions: [], remarks: 'Cleared for Station Commander role.' }
      }
    ];

    for (const c of candidates) {
      let u = await User.findOne({ email: c.email });
      if (!u) {
        u = await User.create({
          name: c.name,
          email: c.email,
          employeeId: c.employeeId,
          password: 'password123',
          role: c.role,
          designation: c.designation,
          organization: c.organization,
          stationId: c.station._id
        });
      }

      let p = await Personnel.findOne({ userId: u._id });
      if (!p) {
        p = await Personnel.create({
          userId: u._id,
          nationality: 'Indian',
          gender: 'Male',
          passport: { passportNumber: c.passport, passportType: 'Ordinary' },
          expedition: {
            expeditionId: exp47._id,
            participationType: c.season,
            assignedStation: c.station._id
          },
          previousExpeditions: [exp46._id],
          profileStatus: 'COMPLETED',
          status: 'READY'
        });
      }

      // Seed Medical Assessment for EXP-47
      await MedicalAssessment.findOneAndUpdate(
        { personnelId: p._id, expeditionId: exp47._id },
        {
          personnelId: p._id,
          expeditionId: exp47._id,
          formCode: 'AL-2205',
          examinationDate: new Date('2026-09-12'),
          examiningOfficer: medOfficer._id,
          physical: c.physical,
          medicalHistory: c.medicalHistory,
          vaccinations: c.vaccinations,
          laboratoryTests: c.lab,
          psychologicalAssessment: c.psych,
          clearance: c.clearance
        },
        { upsert: true, new: true }
      );

      // Seed Training Clearance for EXP-47
      await TrainingClearance.findOneAndUpdate(
        { personnelId: p._id, expeditionId: exp47._id },
        {
          personnelId: p._id,
          expeditionId: exp47._id,
          trainings: [
            { trainingName: 'Polar Survival & Glacier Travel', category: 'SURVIVAL', completedOn: new Date('2026-08-10'), certificateNumber: 'PS-882', validUntil: new Date('2027-08-10'), passed: true },
            { trainingName: 'Station Fire & Life Safety', category: 'FIRE', completedOn: new Date('2026-08-12'), certificateNumber: 'FS-104', validUntil: new Date('2027-08-12'), passed: true },
            { trainingName: 'HF/VHF Radio Protocols & Satcom', category: 'RADIO', completedOn: new Date('2026-08-15'), certificateNumber: 'RD-902', validUntil: new Date('2027-08-15'), passed: c.trainingStatus === 'COMPLETED' || c.trainingStatus === 'PARTIAL' },
            { trainingName: 'First Aid & Cold Injury Trauma', category: 'MEDICAL', completedOn: new Date('2026-08-18'), certificateNumber: 'MED-331', validUntil: new Date('2027-08-18'), passed: c.trainingStatus === 'COMPLETED' },
            { trainingName: 'Crevasse Rescue & Field Safety', category: 'FIELD', completedOn: new Date('2026-08-20'), certificateNumber: 'FL-449', validUntil: new Date('2027-08-20'), passed: c.trainingStatus === 'COMPLETED' }
          ],
          overallStatus: c.trainingStatus,
          finalClearedBy: medOfficer._id,
          clearanceDate: c.trainingStatus === 'COMPLETED' ? new Date('2026-08-25') : null
        },
        { upsert: true, new: true }
      );
    }

    console.log("Seeding finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedData();
