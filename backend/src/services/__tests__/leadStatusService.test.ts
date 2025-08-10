import { LeadStatusService } from '../leadStatusService';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('LeadStatusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStatusToRiskAnalyzed', () => {
    it('should update lead status to assessment_done', async () => {
      const mockEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockEq }));
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      await LeadStatusService.updateStatusToRiskAnalyzed('test-lead-id');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'assessment_done' });
      expect(mockEq).toHaveBeenCalledWith('id', 'test-lead-id');
    });

    it('should throw error when update fails', async () => {
      const mockEq = jest.fn(() => Promise.resolve({ error: 'Update failed' }));
      const mockUpdate = jest.fn(() => ({ eq: mockEq }));
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      await expect(LeadStatusService.updateStatusToRiskAnalyzed('test-lead-id'))
        .rejects.toThrow('Update failed');
    });
  });

  describe('updateStatusToMeetingScheduled', () => {
    it('should update status when current status is lead', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'lead' }, 
        error: null 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));
      
      const mockUpdateEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect
        })
        .mockReturnValueOnce({
          update: mockUpdate
        });

      await LeadStatusService.updateStatusToMeetingScheduled('test-lead-id');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'meeting_scheduled' });
    });

    it('should update status when current status is assessment_done', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'assessment_done' }, 
        error: null 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));
      
      const mockUpdateEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect
        })
        .mockReturnValueOnce({
          update: mockUpdate
        });

      await LeadStatusService.updateStatusToMeetingScheduled('test-lead-id');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'meeting_scheduled' });
    });

    it('should not update status when current status is already meeting_scheduled', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'meeting_scheduled' }, 
        error: null 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));
      
      const mockUpdateEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect
        })
        .mockReturnValueOnce({
          update: mockUpdate
        });

      await LeadStatusService.updateStatusToMeetingScheduled('test-lead-id');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should not update status when current status is converted', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'converted' }, 
        error: null 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));
      
      const mockUpdateEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect
        })
        .mockReturnValueOnce({
          update: mockUpdate
        });

      await LeadStatusService.updateStatusToMeetingScheduled('test-lead-id');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('checkAndUpdateMeetingStatus', () => {
    it('should update status when meetings exist', async () => {
      const mockMeetingsEq = jest.fn(() => Promise.resolve({ 
        data: [{ id: 'meeting-1' }], 
        error: null 
      }));
      const mockMeetingsSelect = jest.fn(() => ({ eq: mockMeetingsEq }));

      const mockLeadSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'assessment_done' }, 
        error: null 
      }));
      const mockLeadEq = jest.fn(() => ({ single: mockLeadSingle }));
      const mockLeadSelect = jest.fn(() => ({ eq: mockLeadEq }));
      
      const mockUpdateEq = jest.fn(() => Promise.resolve({ error: null }));
      const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockMeetingsSelect
        })
        .mockReturnValueOnce({
          select: mockLeadSelect
        })
        .mockReturnValueOnce({
          update: mockUpdate
        });

      await LeadStatusService.checkAndUpdateMeetingStatus('test-lead-id');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'meeting_scheduled' });
    });

    it('should not update status when no meetings exist', async () => {
      const mockEq = jest.fn(() => Promise.resolve({ 
        data: [], 
        error: null 
      }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      await LeadStatusService.checkAndUpdateMeetingStatus('test-lead-id');

      // Should not call any update operations
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLeadStatus', () => {
    it('should return lead status', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: { status: 'lead' }, 
        error: null 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const status = await LeadStatusService.getLeadStatus('test-lead-id');

      expect(status).toBe('lead');
    });

    it('should throw error when fetch fails', async () => {
      const mockSingle = jest.fn(() => Promise.resolve({ 
        data: null, 
        error: 'Fetch failed' 
      }));
      const mockEq = jest.fn(() => ({ single: mockSingle }));
      const mockSelect = jest.fn(() => ({ eq: mockEq }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      await expect(LeadStatusService.getLeadStatus('test-lead-id'))
        .rejects.toThrow('Fetch failed');
    });
  });
});
